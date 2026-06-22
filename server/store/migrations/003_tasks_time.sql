-- +goose Up

CREATE TABLE IF NOT EXISTS campfire_projects (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL,
    color VARCHAR(32) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_projects_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_campfire_projects_workspace_name
    ON campfire_projects(workspace_id, name);

CREATE TABLE IF NOT EXISTS campfire_task_categories (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(32) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_task_categories_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_campfire_task_categories_workspace_name
    ON campfire_task_categories(workspace_id, name);

CREATE TABLE IF NOT EXISTS campfire_tasks (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    source_submission_id VARCHAR(36) NOT NULL,
    source_answer_id VARCHAR(36) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    status VARCHAR(32) NOT NULL,
    board_url TEXT NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP NULL,

    CONSTRAINT fk_campfire_tasks_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campfire_tasks_workspace_user
    ON campfire_tasks(workspace_id, user_id);

CREATE INDEX IF NOT EXISTS idx_campfire_tasks_workspace_status
    ON campfire_tasks(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_campfire_tasks_workspace_project
    ON campfire_tasks(workspace_id, project_id);

CREATE INDEX IF NOT EXISTS idx_campfire_tasks_workspace_category
    ON campfire_tasks(workspace_id, category_id);

CREATE TABLE IF NOT EXISTS campfire_time_entries (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    entry_date VARCHAR(10) NOT NULL,
    minutes INTEGER NOT NULL,
    note TEXT NOT NULL,
    project_id VARCHAR(36) NOT NULL,
    category_id VARCHAR(36) NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_time_entries_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_time_entries_task
        FOREIGN KEY (task_id)
        REFERENCES campfire_tasks(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campfire_time_entries_workspace_date
    ON campfire_time_entries(workspace_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_campfire_time_entries_workspace_user_date
    ON campfire_time_entries(workspace_id, user_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_campfire_time_entries_task
    ON campfire_time_entries(task_id);

CREATE INDEX IF NOT EXISTS idx_campfire_time_entries_project_date
    ON campfire_time_entries(project_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_campfire_time_entries_category_date
    ON campfire_time_entries(category_id, entry_date);

-- +goose Down

DROP TABLE IF EXISTS campfire_time_entries;
DROP TABLE IF EXISTS campfire_tasks;
DROP TABLE IF EXISTS campfire_task_categories;
DROP TABLE IF EXISTS campfire_projects;
