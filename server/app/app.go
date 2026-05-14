package app

import (
	"fmt"
	"net/http"

	"github.com/amir-zouerami/campfire/server/api"
	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/mattermost/mattermost/server/public/plugin"
)

/*
Config contains external dependencies provided by the Mattermost plugin runtime.
*/
type Config struct {
	API plugin.API
}

/*
App is the Campfire application container.

It wires infrastructure, services, stores, and routes while keeping business
logic out of the Mattermost plugin lifecycle layer.
*/
type App struct {
	Router                http.Handler
	Logger                logger.Logger
	Mattermost            mattermost.Client
	Database              *store.Database
	WorkspaceService      *service.WorkspaceService
	GlobalSkipDateService *service.GlobalSkipDateService
	LeaveService          *service.LeaveService
}

/*
New constructs the Campfire application dependency graph.

This function opens SQL using Mattermost's database configuration, runs embedded
Campfire migrations, and wires clean service/store boundaries.
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

	workspaceStore := store.NewSQLWorkspaceStore(database)
	workspaceService := service.NewWorkspaceService(workspaceStore)

	globalSkipDateStore := store.NewSQLGlobalSkipDateStore(database)
	globalSkipDateService := service.NewGlobalSkipDateService(globalSkipDateStore)

	leaveService := service.NewLeaveService(globalSkipDateStore)

	router := api.NewRouter(api.RouterConfig{
		Logger:                appLogger,
		Mattermost:            mattermostClient,
		WorkspaceService:      workspaceService,
		GlobalSkipDateService: globalSkipDateService,
		LeaveService:          leaveService,
	})

	return &App{
		Router:                router,
		Logger:                appLogger,
		Mattermost:            mattermostClient,
		Database:              database,
		WorkspaceService:      workspaceService,
		GlobalSkipDateService: globalSkipDateService,
		LeaveService:          leaveService,
	}, nil
}

/*
Shutdown releases resources owned by the application container.
*/
func (a *App) Shutdown() {
	if a.Database != nil {
		if err := a.Database.Close(); err != nil {
			a.Logger.Warn("failed to close Campfire database", logger.String("message", err.Error()))
		}
	}

	a.Logger.Info("Campfire application shutdown")
}
