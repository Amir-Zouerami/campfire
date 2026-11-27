package service

import (
	"context"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

type memoryTasks struct {
	store.TaskStore
	tasks   []domain.Task
	touched []domain.ID
	removed []domain.ID
}

func (m *memoryTasks) ListTasksByWorkspaceIDAndUserID(context.Context, domain.ID, string, bool) ([]domain.Task, error) {
	return slices.Clone(m.tasks), nil
}

func (m *memoryTasks) CreateTask(_ context.Context, params store.CreateTaskParams) (*domain.Task, error) {
	m.tasks = append(m.tasks, params.Task)
	return &params.Task, nil
}

func (m *memoryTasks) TouchTask(_ context.Context, _ domain.ID, id domain.ID, _ time.Time) error {
	m.touched = append(m.touched, id)
	return nil
}

func (m *memoryTasks) DeleteUnusedTask(_ context.Context, _ domain.ID, id domain.ID) error {
	m.removed = append(m.removed, id)
	return nil
}

func workItems(items ...string) []domain.StandupAnswer {
	value := `"- ` + strings.Join(items, `\n- `) + `"`
	return []domain.StandupAnswer{{ID: "a", QuestionID: "q", ValueJSON: value}}
}

func TestStandupWorkItemsBecomeTasks(t *testing.T) {
	created := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	tasks := &memoryTasks{tasks: []domain.Task{
		{ID: "old", Title: "Review API", SourceSubmissionID: "earlier", Status: domain.TaskStatusActive, CreatedAt: created, UpdatedAt: created},
		{ID: "typo", Title: "Fix logni", Description: standupTaskDescription, SourceSubmissionID: "s", Status: domain.TaskStatusActive, CreatedAt: created, UpdatedAt: created},
	}}
	service := &StandupService{taskStore: tasks}
	question := domain.StandupQuestion{ID: "q", CreatesTasks: true}

	made, err := service.createTasksFromStandupAnswers(context.Background(), domain.StandupSubmission{ID: "s"},
		workItems("Fix login", "review  api", "None", "ندارم"), []domain.StandupQuestion{question})
	if err != nil {
		t.Fatal(err)
	}

	if len(made) != 1 || made[0].Title != "Fix login" {
		t.Errorf("created = %+v, want only Fix login", made)
	}
	if !slices.Equal(tasks.touched, []domain.ID{"old"}) {
		t.Errorf("touched = %v, want the reused task", tasks.touched)
	}
	if !slices.Equal(tasks.removed, []domain.ID{"typo"}) {
		t.Errorf("removed = %v, want the corrected typo", tasks.removed)
	}
}

func TestPrivateAnswersNeverBecomeTasks(t *testing.T) {
	tasks := &memoryTasks{}
	service := &StandupService{taskStore: tasks}
	question := domain.StandupQuestion{ID: "q", CreatesTasks: true, IsPrivate: true}

	made, err := service.createTasksFromStandupAnswers(context.Background(), domain.StandupSubmission{ID: "s"},
		workItems("Salary talk"), []domain.StandupQuestion{question})
	if err != nil || len(made) != 0 {
		t.Errorf("created = %+v (%v), want none", made, err)
	}
}

func TestDefaultProgressQuestionsShowTime(t *testing.T) {
	progress := []string{"Yesterday", "کارهای دیروز", "عمل أمس", "Progress"}
	plans := []string{"Today", "برنامه امروز", "خطة اليوم"}

	for _, section := range progress {
		if !reportQuestionShouldShowTaskTime(domain.StandupQuestion{CreatesTasks: true, Section: section}) {
			t.Errorf("section %q should show time", section)
		}
	}
	for _, section := range plans {
		if reportQuestionShouldShowTaskTime(domain.StandupQuestion{CreatesTasks: true, Section: section}) {
			t.Errorf("section %q should not show time", section)
		}
	}
}

func TestResavingKeepsItemsThatAreStillListed(t *testing.T) {
	created := time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)
	tasks := &memoryTasks{tasks: []domain.Task{
		{ID: "kept", Title: "Fix login", Description: standupTaskDescription, SourceSubmissionID: "s", Status: domain.TaskStatusActive, CreatedAt: created, UpdatedAt: created},
	}}
	service := &StandupService{taskStore: tasks}
	// The switch was turned off after the first save.
	question := domain.StandupQuestion{ID: "q", CreatesTasks: false}

	if _, err := service.createTasksFromStandupAnswers(context.Background(), domain.StandupSubmission{ID: "s"},
		workItems("Fix login"), []domain.StandupQuestion{question}); err != nil {
		t.Fatal(err)
	}
	if len(tasks.removed) != 0 {
		t.Errorf("removed = %v, want nothing", tasks.removed)
	}
}
