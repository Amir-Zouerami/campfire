package app

import (
	"fmt"
	"net/http"
	"time"

	"github.com/amir-zouerami/campfire/server/api"
	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/scheduler"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/pluginapi"
)

const (
	campfireBotUsername    = "campfire"
	campfireBotDisplayName = "Campfire"
	campfireBotDescription = "Campfire team operations assistant."
)

/*
Config contains external dependencies provided by the Mattermost plugin runtime.
*/
type Config struct {
	API    plugin.API
	Driver plugin.Driver
}

/*
App is the Campfire application container.

It wires infrastructure, services, stores, and routes while keeping business
logic out of the Mattermost plugin lifecycle layer.
*/
type App struct {
	Router                          http.Handler
	Logger                          logger.Logger
	Mattermost                      mattermost.Client
	Database                        *store.Database
	WorkspaceService                *service.WorkspaceService
	UserDirectoryService            *service.UserDirectoryService
	WorkspaceMemberDirectoryService *service.WorkspaceMemberDirectoryService
	WorkspaceCalendarService        *service.WorkspaceCalendarService
	ReminderService                 *service.ReminderService
	ReminderExecutionService        *service.ReminderExecutionService
	GlobalSkipDateService           *service.GlobalSkipDateService
	LeaveValidationService          *service.LeaveValidationService
	LeaveService                    *service.LeaveService
	StandupRuntimeService           *service.StandupRuntimeService
	StandupService                  *service.StandupService
	ReportService                   *service.ReportService
	TimeReportService               *service.TimeReportService
	GlobalReportService             *service.GlobalReportService
	SavedReportFilterService        *service.SavedReportFilterService
	ExportService                   *service.ExportService
	TaskService                     *service.TaskService
	Scheduler                       *scheduler.Runner
}

/*
New constructs the Campfire application dependency graph.

This function opens SQL using Mattermost's database configuration, runs embedded
Campfire migrations, ensures the Campfire bot account, and wires clean
service/store boundaries.
*/
func New(config Config) (*App, error) {
	appLogger := logger.NewMattermostLogger(config.API)
	mattermostClient := mattermost.NewPluginClient(config.API)

	database, err := store.OpenMattermostDatabase(config.API)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	if err := store.RunMigrations(database); err != nil {
		closeErr := database.Close()
		if closeErr != nil {
			return nil, fmt.Errorf("run migrations: %w; close database: %v", err, closeErr)
		}

		return nil, fmt.Errorf("run migrations: %w", err)
	}

	pluginClient := pluginapi.NewClient(config.API, config.Driver)
	botUserID, err := pluginClient.Bot.EnsureBot(&model.Bot{
		Username:    campfireBotUsername,
		DisplayName: campfireBotDisplayName,
		Description: campfireBotDescription,
	})
	if err != nil {
		closeErr := database.Close()
		if closeErr != nil {
			return nil, fmt.Errorf("ensure bot: %w; close database: %v", err, closeErr)
		}

		return nil, fmt.Errorf("ensure bot: %w", err)
	}

	workspaceStore := store.NewSQLWorkspaceStore(database)
	workspaceRoleStore := store.NewSQLWorkspaceRoleStore(database)
	workspaceCalendarStore := store.NewSQLWorkspaceCalendarStore(database)
	workspaceService := service.NewWorkspaceService(workspaceStore)
	workspaceCalendarService := service.NewWorkspaceCalendarService(
		workspaceStore,
		workspaceCalendarStore,
		workspaceRoleStore,
	)

	globalSkipDateStore := store.NewSQLGlobalSkipDateStore(database)
	globalSkipDateService := service.NewGlobalSkipDateService(globalSkipDateStore)
	leaveValidationService := service.NewLeaveValidationService(globalSkipDateStore)

	leaveStore := store.NewSQLLeaveStore(database)
	standupStore := store.NewSQLStandupStore(database)
	reportStore := store.NewSQLReportStore(database)
	savedReportFilterStore := store.NewSQLSavedReportFilterStore(database)
	taskStore := store.NewSQLTaskStore(database)
	reminderStore := store.NewSQLReminderStore(database)
	notificationRunStore := store.NewSQLNotificationRunStore(database)

	notificationPublisher := mattermost.NewNotificationPublisher(config.API, botUserID)
	workspaceMemberProvider := mattermost.NewWorkspaceMemberProvider(config.API)
	userDirectoryProvider := mattermost.NewUserDirectoryProvider(config.API)
	userDirectoryService := service.NewUserDirectoryService(userDirectoryProvider)

	workspaceMemberDirectoryService := service.NewWorkspaceMemberDirectoryService(
		workspaceStore,
		workspaceMemberProvider,
		userDirectoryProvider,
	)

	leaveService := service.NewLeaveService(
		leaveStore,
		leaveValidationService,
		workspaceStore,
		workspaceRoleStore,
		notificationPublisher,
	)

	standupRuntimeService := service.NewStandupRuntimeService(
		workspaceStore,
		workspaceCalendarStore,
		globalSkipDateStore,
		leaveStore,
		workspaceMemberProvider,
	)

	standupService := service.NewStandupService(
		workspaceStore,
		workspaceRoleStore,
		standupStore,
		leaveStore,
		workspaceMemberProvider,
	)

	reminderService := service.NewReminderService(
		workspaceStore,
		workspaceRoleStore,
		reminderStore,
	)

	reminderExecutionService := service.NewReminderExecutionService(
		workspaceStore,
		reminderStore,
		notificationRunStore,
		standupService,
		notificationPublisher,
	)

	timeReportService := service.NewTimeReportService(
		workspaceStore,
		workspaceRoleStore,
		taskStore,
	)

	globalReportService := service.NewGlobalReportService(
		workspaceStore,
		taskStore,
		userDirectoryProvider,
	)

	reportPublisher := mattermost.NewReportPublisher(config.API, botUserID)
	reportService := service.NewReportService(
		standupService,
		workspaceStore,
		workspaceRoleStore,
		reportStore,
		reportPublisher,
		userDirectoryProvider,
	)

	savedReportFilterService := service.NewSavedReportFilterService(
		workspaceStore,
		savedReportFilterStore,
	)

	exportService := service.NewExportService(
		workspaceStore,
		workspaceRoleStore,
		taskStore,
		leaveStore,
		standupService,
		userDirectoryProvider,
	)

	taskService := service.NewTaskService(
		workspaceStore,
		taskStore,
	)

	schedulerRunner := scheduler.NewRunner(scheduler.Config{
		Logger:                   appLogger,
		WorkspaceProvider:        workspaceStore,
		StandupScheduleProvider:  standupStore,
		ReminderRuleProvider:     reminderStore,
		StandupRuntimeProvider:   standupRuntimeService,
		ReminderSequenceExecutor: reminderExecutionService,
		ReportAutomationExecutor: reportService,
		Interval:                 time.Minute,
	})

	router := api.NewRouter(api.RouterConfig{
		Logger:                          appLogger,
		Mattermost:                      mattermostClient,
		WorkspaceService:                workspaceService,
		UserDirectoryService:            userDirectoryService,
		WorkspaceMemberDirectoryService: workspaceMemberDirectoryService,
		WorkspaceCalendarService:        workspaceCalendarService,
		ReminderService:                 reminderService,
		GlobalSkipDateService:           globalSkipDateService,
		LeaveValidationService:          leaveValidationService,
		LeaveService:                    leaveService,
		StandupRuntimeService:           standupRuntimeService,
		StandupService:                  standupService,
		ReportService:                   reportService,
		TimeReportService:               timeReportService,
		GlobalReportService:             globalReportService,
		SavedReportFilterService:        savedReportFilterService,
		ExportService:                   exportService,
		TaskService:                     taskService,
	})

	return &App{
		Router:                          router,
		Logger:                          appLogger,
		Mattermost:                      mattermostClient,
		Database:                        database,
		WorkspaceService:                workspaceService,
		UserDirectoryService:            userDirectoryService,
		WorkspaceMemberDirectoryService: workspaceMemberDirectoryService,
		WorkspaceCalendarService:        workspaceCalendarService,
		ReminderService:                 reminderService,
		ReminderExecutionService:        reminderExecutionService,
		GlobalSkipDateService:           globalSkipDateService,
		LeaveValidationService:          leaveValidationService,
		LeaveService:                    leaveService,
		StandupRuntimeService:           standupRuntimeService,
		StandupService:                  standupService,
		ReportService:                   reportService,
		TimeReportService:               timeReportService,
		GlobalReportService:             globalReportService,
		SavedReportFilterService:        savedReportFilterService,
		ExportService:                   exportService,
		TaskService:                     taskService,
		Scheduler:                       schedulerRunner,
	}, nil
}

/*
Start begins application-owned background work.
*/
func (a *App) Start() {
	if a.Scheduler != nil {
		a.Scheduler.Start()
	}
}

/*
Shutdown releases resources owned by the application container.
*/
func (a *App) Shutdown() {
	if a.Scheduler != nil {
		a.Scheduler.Stop()
	}

	if a.Database != nil {
		if err := a.Database.Close(); err != nil {
			a.Logger.Warn("failed to close Campfire database", logger.String("message", err.Error()))
		}
	}

	a.Logger.Info("Campfire application shutdown")
}
