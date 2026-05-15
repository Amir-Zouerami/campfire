package scheduler

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/logger"
)

/*
WorkspaceProvider defines the workspace reads needed by the scheduler.

The runner depends on this small interface instead of a concrete SQL store.
*/
type WorkspaceProvider interface {
	ListActive(ctx context.Context) ([]domain.Workspace, error)
}

/*
Config contains dependencies and timing options for the scheduler runner.
*/
type Config struct {
	Logger            logger.Logger
	WorkspaceProvider WorkspaceProvider
	Interval          time.Duration
}

/*
Runner owns Campfire's background scheduler loop.
*/
type Runner struct {
	logger            logger.Logger
	workspaceProvider WorkspaceProvider
	interval          time.Duration

	mutex  sync.Mutex
	cancel context.CancelFunc
	done   chan struct{}
}

/*
NewRunner creates a scheduler runner.
*/
func NewRunner(config Config) *Runner {
	interval := config.Interval
	if interval <= 0 {
		interval = time.Minute
	}

	return &Runner{
		logger:            config.Logger,
		workspaceProvider: config.WorkspaceProvider,
		interval:          interval,
		done:              make(chan struct{}),
	}
}

/*
Start starts the scheduler loop.

Calling Start more than once is safe.
*/
func (r *Runner) Start() {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	if r.cancel != nil {
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	r.cancel = cancel
	r.done = make(chan struct{})

	go r.run(ctx)

	r.logger.Info("Campfire scheduler started")
}

/*
Stop stops the scheduler loop and waits for it to exit.

Calling Stop before Start or more than once is safe.
*/
func (r *Runner) Stop() {
	r.mutex.Lock()
	cancel := r.cancel
	done := r.done
	r.cancel = nil
	r.mutex.Unlock()

	if cancel == nil {
		return
	}

	cancel()
	<-done

	r.logger.Info("Campfire scheduler stopped")
}

/*
run executes scheduler ticks until the runner is stopped.
*/
func (r *Runner) run(ctx context.Context) {
	defer close(r.done)

	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return

		case <-ticker.C:
			r.tick(ctx)
		}
	}
}

/*
tick performs one scheduler pass.

This foundation pass intentionally only loads active workspaces and logs the
count. Reminder/report execution will be wired in subsequent passes.
*/
func (r *Runner) tick(ctx context.Context) {
	if r.workspaceProvider == nil {
		r.logger.Warn("scheduler workspace provider is not configured")
		return
	}

	workspaces, err := r.workspaceProvider.ListActive(ctx)
	if err != nil {
		r.logger.Warn("scheduler failed to load active workspaces", logger.String("error", err.Error()))
		return
	}

	r.logger.Debug(
		"scheduler tick loaded active workspaces",
		logger.String("count", fmt.Sprintf("%d", len(workspaces))),
	)
}
