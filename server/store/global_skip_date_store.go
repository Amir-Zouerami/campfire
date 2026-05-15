package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
GlobalSkipDateStore defines persistence operations for global Campfire off-days.
*/
type GlobalSkipDateStore interface {
	List(ctx context.Context) ([]domain.GlobalSkipDate, error)
	ListBetween(ctx context.Context, startDate domain.LocalDate, endDate domain.LocalDate) ([]domain.GlobalSkipDate, error)
	Create(ctx context.Context, skipDate domain.GlobalSkipDate) (*domain.GlobalSkipDate, error)
	Delete(ctx context.Context, skipDateID domain.ID) error
}

/*
SQLGlobalSkipDateStore persists global skip dates in SQL.
*/
type SQLGlobalSkipDateStore struct {
	db *sqlx.DB
}

/*
NewSQLGlobalSkipDateStore creates a SQL-backed global skip date store.
*/
func NewSQLGlobalSkipDateStore(database *Database) *SQLGlobalSkipDateStore {
	return &SQLGlobalSkipDateStore{
		db: database.DB,
	}
}

/*
List returns all global skip dates ordered by date.
*/
func (s *SQLGlobalSkipDateStore) List(ctx context.Context) ([]domain.GlobalSkipDate, error) {
	records := []globalSkipDateRecord{}

	query := s.db.Rebind(`
		SELECT
			id,
			date,
			label,
			created_by,
			created_at
		FROM campfire_global_skip_dates
		ORDER BY date ASC
	`)

	if err := s.db.SelectContext(ctx, &records, query); err != nil {
		return nil, fmt.Errorf("list global skip dates: %w", err)
	}

	return globalSkipDateRecordsToDomain(records), nil
}

/*
ListBetween returns global skip dates overlapping an inclusive date range.
*/
func (s *SQLGlobalSkipDateStore) ListBetween(
	ctx context.Context,
	startDate domain.LocalDate,
	endDate domain.LocalDate,
) ([]domain.GlobalSkipDate, error) {
	records := []globalSkipDateRecord{}

	query := s.db.Rebind(`
		SELECT
			id,
			date,
			label,
			created_by,
			created_at
		FROM campfire_global_skip_dates
		WHERE date >= ? AND date <= ?
		ORDER BY date ASC
	`)

	if err := s.db.SelectContext(ctx, &records, query, startDate.String(), endDate.String()); err != nil {
		return nil, fmt.Errorf("list global skip dates between dates: %w", err)
	}

	return globalSkipDateRecordsToDomain(records), nil
}

/*
Create inserts a global skip date.

The store checks for an existing date first so callers receive a typed conflict
instead of a generic SQL uniqueness error.
*/
func (s *SQLGlobalSkipDateStore) Create(
	ctx context.Context,
	skipDate domain.GlobalSkipDate,
) (*domain.GlobalSkipDate, error) {
	exists, err := s.existsByDate(ctx, skipDate.Date)
	if err != nil {
		return nil, err
	}

	if exists {
		return nil, ErrConflict
	}

	_, err = s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_global_skip_dates (
				id,
				date,
				label,
				created_by,
				created_at
			) VALUES (?, ?, ?, ?, ?)
		`),
		skipDate.ID.String(),
		skipDate.Date.String(),
		skipDate.Label,
		skipDate.CreatedBy,
		skipDate.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert global skip date: %w", err)
	}

	return &skipDate, nil
}

/*
Delete removes a global skip date by ID.
*/
func (s *SQLGlobalSkipDateStore) Delete(ctx context.Context, skipDateID domain.ID) error {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			DELETE FROM campfire_global_skip_dates
			WHERE id = ?
		`),
		skipDateID.String(),
	)
	if err != nil {
		return fmt.Errorf("delete global skip date: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read global skip date delete result: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

/*
existsByDate returns true when a global skip date already exists for a date.
*/
func (s *SQLGlobalSkipDateStore) existsByDate(ctx context.Context, date domain.LocalDate) (bool, error) {
	var existingID string

	err := s.db.GetContext(
		ctx,
		&existingID,
		s.db.Rebind(`
			SELECT id
			FROM campfire_global_skip_dates
			WHERE date = ?
			LIMIT 1
		`),
		date.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}

		return false, fmt.Errorf("check global skip date existence: %w", err)
	}

	return true, nil
}

/*
globalSkipDateRecord represents a row from campfire_global_skip_dates.
*/
type globalSkipDateRecord struct {
	ID        string    `db:"id"`
	Date      string    `db:"date"`
	Label     string    `db:"label"`
	CreatedBy string    `db:"created_by"`
	CreatedAt time.Time `db:"created_at"`
}

/*
toDomain maps a global skip date database record to the domain model.
*/
func (r globalSkipDateRecord) toDomain() domain.GlobalSkipDate {
	return domain.GlobalSkipDate{
		ID:        domain.ID(r.ID),
		Date:      domain.LocalDate(r.Date),
		Label:     r.Label,
		CreatedBy: r.CreatedBy,
		CreatedAt: parseStoredTime(r.CreatedAt),
	}
}

/*
globalSkipDateRecordsToDomain maps global skip date records to domain models.
*/
func globalSkipDateRecordsToDomain(records []globalSkipDateRecord) []domain.GlobalSkipDate {
	skipDates := make([]domain.GlobalSkipDate, 0, len(records))

	for _, record := range records {
		skipDates = append(skipDates, record.toDomain())
	}

	return skipDates
}
