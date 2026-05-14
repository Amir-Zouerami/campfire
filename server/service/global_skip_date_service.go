package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

/*
CreateGlobalSkipDateInput contains user-submitted global off-day data.
*/
type CreateGlobalSkipDateInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	Date          string
	Label         string
}

/*
GlobalSkipDateService owns global off-day business rules.
*/
type GlobalSkipDateService struct {
	globalSkipDateStore store.GlobalSkipDateStore
}

/*
NewGlobalSkipDateService creates a global skip date service.
*/
func NewGlobalSkipDateService(globalSkipDateStore store.GlobalSkipDateStore) *GlobalSkipDateService {
	return &GlobalSkipDateService{
		globalSkipDateStore: globalSkipDateStore,
	}
}

/*
List returns global skip dates for Campfire Admins.
*/
func (s *GlobalSkipDateService) List(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
) ([]domain.GlobalSkipDate, error) {
	if err := requireGlobalAdmin(actorUserID, isSystemAdmin); err != nil {
		return nil, err
	}

	skipDates, err := s.globalSkipDateStore.List(ctx)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load global off-days.")
	}

	return skipDates, nil
}

/*
Create validates and creates a global skip date.
*/
func (s *GlobalSkipDateService) Create(
	ctx context.Context,
	input CreateGlobalSkipDateInput,
) (*domain.GlobalSkipDate, error) {
	if err := requireGlobalAdmin(input.ActorUserID, input.IsSystemAdmin); err != nil {
		return nil, err
	}

	date := domain.LocalDate(strings.TrimSpace(input.Date))
	if !date.IsValid() {
		return nil, NewError(ErrorCodeValidationFailed, "Date must use YYYY-MM-DD format.")
	}

	label := strings.TrimSpace(input.Label)
	if label == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Label is required.")
	}

	skipDate := domain.GlobalSkipDate{
		ID:        domain.ID(uuid.NewString()),
		Date:      date,
		Label:     label,
		CreatedBy: strings.TrimSpace(input.ActorUserID),
		CreatedAt: time.Now().UTC(),
	}

	created, err := s.globalSkipDateStore.Create(ctx, skipDate)
	if err != nil {
		if errors.Is(err, store.ErrConflict) {
			return nil, NewError(ErrorCodeConflict, "A global off-day already exists for this date.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not create global off-day.")
	}

	return created, nil
}

/*
Delete removes a global skip date.
*/
func (s *GlobalSkipDateService) Delete(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	skipDateID string,
) error {
	if err := requireGlobalAdmin(actorUserID, isSystemAdmin); err != nil {
		return err
	}

	cleanSkipDateID := strings.TrimSpace(skipDateID)
	if cleanSkipDateID == "" {
		return NewError(ErrorCodeValidationFailed, "Global off-day ID is required.")
	}

	err := s.globalSkipDateStore.Delete(ctx, domain.ID(cleanSkipDateID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return NewError(ErrorCodeNotFound, "Global off-day was not found.")
		}

		return NewError(ErrorCodeInternal, "Could not delete global off-day.")
	}

	return nil
}

/*
requireGlobalAdmin verifies that an actor can manage global Campfire settings.
*/
func requireGlobalAdmin(actorUserID string, isSystemAdmin bool) error {
	if strings.TrimSpace(actorUserID) == "" {
		return NewError(ErrorCodePermissionDenied, "You must be signed in to manage global Campfire settings.")
	}

	if !isSystemAdmin {
		return NewError(ErrorCodePermissionDenied, "Only Mattermost system admins can manage global Campfire settings.")
	}

	return nil
}
