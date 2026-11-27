package service

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

type fakeWorkspaces struct{ store.WorkspaceStore }

func (fakeWorkspaces) GetByID(_ context.Context, id domain.ID) (*domain.Workspace, error) {
	return &domain.Workspace{ID: id, ChannelID: "channel"}, nil
}

type fakeRoles struct {
	store.WorkspaceRoleStore
	roles map[string][]domain.Role
}

func (f fakeRoles) GetSettings(context.Context, domain.ID) (*domain.WorkspaceRoleSettings, error) {
	return &domain.WorkspaceRoleSettings{ChannelAdminsAreLeads: true, SystemAdminsAreAdmins: true}, nil
}

func (f fakeRoles) ListRolesForUser(_ context.Context, _ domain.ID, userID string) ([]domain.Role, error) {
	return f.roles[userID], nil
}

func (f fakeRoles) UserHasAnyRole(_ context.Context, _ domain.ID, userID string, roles []domain.Role) (bool, error) {
	return slices.ContainsFunc(f.roles[userID], func(role domain.Role) bool { return slices.Contains(roles, role) }), nil
}

type fakeChannels struct{}

func (fakeChannels) IsChannelAdmin(_ string, userID string) (bool, error) {
	return userID == "channel-admin", nil
}
func (fakeChannels) IsChannelMember(string, string) (bool, error) { return true, nil }

func testPermissions() *PermissionService {
	roles := fakeRoles{roles: map[string][]domain.Role{
		"admin":    {domain.RoleAdmin},
		"approver": {domain.RoleApprover},
	}}

	return NewPermissionService(fakeWorkspaces{}, roles, fakeChannels{})
}

func wantCode(t *testing.T, err error, code ErrorCode) {
	t.Helper()

	var serviceError *Error
	if !errors.As(err, &serviceError) || serviceError.Code != code {
		t.Fatalf("error = %v, want code %s", err, code)
	}
}

// The screens grant these users access, so the services must too.
func TestServicesHonourScreenPermissions(t *testing.T) {
	permissions := testPermissions()
	ctx := context.Background()

	checks := map[string]func(userID string) error{
		"standups": func(u string) error {
			return (&StandupService{permissions: permissions}).requireStandupManagement(ctx, u, false, "w")
		},
		"calendar": func(u string) error {
			return (&WorkspaceCalendarService{permissions: permissions}).requireWorkspaceCalendarManagement(ctx, u, false, "w")
		},
		"reminders": func(u string) error {
			return (&ReminderService{permissions: permissions}).requireReminderManagement(ctx, u, false, "w")
		},
		"audit": func(u string) error {
			return (&AuditService{permissions: permissions}).requireAuditViewPermission(ctx, u, false, "w")
		},
		"report posting": func(u string) error {
			return (&ReportService{permissions: permissions}).requireReportPostPermission(ctx, u, false, "w")
		},
		"export": func(u string) error {
			return (&ExportService{permissions: permissions}).requireExportPermission(ctx, u, false, "w")
		},
		"time report": func(u string) error {
			return (&TimeReportService{permissions: permissions}).requireTimeReportPermission(ctx, u, false, "w")
		},
		"leave decisions": func(u string) error {
			return (&LeaveService{permissions: permissions}).requireLeaveDecisionPermission(ctx, u, false, "w")
		},
	}

	for name, check := range checks {
		for _, userID := range []string{"admin", "channel-admin"} {
			if err := check(userID); err != nil {
				t.Errorf("%s: %s was denied: %v", name, userID, err)
			}
		}
		if err := check("member"); err == nil {
			t.Errorf("%s: plain member was allowed", name)
		}
	}
}

type fakeLeaves struct {
	store.LeaveStore
	request domain.LeaveRequest
}

func (f fakeLeaves) GetRequestByID(context.Context, domain.ID) (*domain.LeaveRequest, error) {
	request := f.request
	return &request, nil
}

func (f fakeLeaves) GetChangeRequestByID(context.Context, domain.ID) (*domain.LeaveChangeRequest, error) {
	return &domain.LeaveChangeRequest{WorkspaceID: "w", RequesterUserID: "approver", Status: domain.LeaveChangeRequestStatusPending}, nil
}

func TestApproversCannotDecideTheirOwnLeave(t *testing.T) {
	service := &LeaveService{
		permissions:    testPermissions(),
		workspaceStore: fakeWorkspaces{},
		leaveStore:     fakeLeaves{request: domain.LeaveRequest{WorkspaceID: "w", UserID: "approver", Status: domain.LeaveStatusPending}},
	}

	_, err := service.Decide(context.Background(), DecideLeaveInput{ActorUserID: "approver", LeaveRequestID: "r", Decision: "approved"})
	wantCode(t, err, ErrorCodePermissionDenied)

	_, _, err = service.DecideChange(context.Background(), DecideLeaveChangeInput{ActorUserID: "approver", ChangeRequestID: "c", Decision: "approved"})
	wantCode(t, err, ErrorCodePermissionDenied)
}

type fakeTasks struct{ store.TaskStore }

func (fakeTasks) GetTaskByID(context.Context, domain.ID, domain.ID) (*domain.Task, error) {
	return &domain.Task{ID: "t", UserID: "owner"}, nil
}

func TestTimeCannotBeLoggedOnSomeoneElsesTask(t *testing.T) {
	service := NewTaskService(fakeWorkspaces{}, fakeTasks{})

	_, err := service.CreateTimeEntry(context.Background(), CreateTimeEntryInput{
		ActorUserID: "intruder", WorkspaceID: "w", TaskID: "t", EntryDate: "2026-11-01", Minutes: 5,
	})
	wantCode(t, err, ErrorCodePermissionDenied)
}
