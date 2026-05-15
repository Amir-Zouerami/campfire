package main

import (
	"net/http"
	"strings"

	"github.com/amir-zouerami/campfire/server/app"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

/*
Plugin is the Mattermost server plugin entrypoint for Campfire.

It owns the plugin lifecycle and delegates application concerns to the
clean application layer. Business rules must not be implemented here.
*/
type Plugin struct {
	plugin.MattermostPlugin

	application *app.App
}

/*
OnActivate initializes the Campfire application when Mattermost enables the plugin.

This method should stay focused on lifecycle wiring:
  - initialize dependencies
  - build the HTTP router
  - register slash commands
  - later run migrations
  - later start the scheduler
*/
func (p *Plugin) OnActivate() error {
	application, err := app.New(app.Config{
		API:    p.API,
		Driver: p.Driver,
	})
	if err != nil {
		return err
	}

	p.application = application
	p.application.Start()

	if err := p.registerCommands(); err != nil {
		p.application.Shutdown()
		p.application = nil

		return err
	}

	return nil
}

/*
OnDeactivate shuts down Campfire-owned resources.

Later phases will stop the scheduler and close database resources here.
*/
func (p *Plugin) OnDeactivate() error {
	if p.application != nil {
		p.application.Shutdown()
	}

	return nil
}

/*
ServeHTTP routes Mattermost plugin HTTP traffic into the Campfire API router.

All API authentication, request parsing, and response formatting belongs in
the api package rather than in this plugin lifecycle file.
*/
func (p *Plugin) ServeHTTP(_ *plugin.Context, w http.ResponseWriter, r *http.Request) {
	if p.application == nil {
		http.Error(w, "Campfire is not ready", http.StatusServiceUnavailable)
		return
	}

	p.application.Router.ServeHTTP(w, r)
}

/*
ExecuteCommand handles Campfire slash command invocations.

The slash command is intentionally lightweight. Campfire's primary experience
will be the React app, not a giant command-only workflow.
*/
func (p *Plugin) ExecuteCommand(_ *plugin.Context, args *model.CommandArgs) (*model.CommandResponse, *model.AppError) {
	commandText := strings.TrimSpace(args.Command)
	commandText = strings.TrimPrefix(commandText, "/campfire")
	commandText = strings.TrimSpace(commandText)

	if commandText == "" || commandText == "help" {
		return p.commandHelpResponse(), nil
	}

	switch commandText {
	case "standup":
		return p.commandActionResponse("Open Campfire to submit your standup."), nil
	case "leave":
		return p.commandActionResponse("Open Campfire to request or review leave."), nil
	case "time":
		return p.commandActionResponse("Open Campfire to add task time."), nil
	case "report":
		return p.commandActionResponse("Open Campfire to preview and post reports."), nil
	case "settings":
		return p.commandActionResponse("Open Campfire settings for this channel."), nil
	default:
		return p.commandActionResponse("Unknown Campfire command. Try `/campfire help`."), nil
	}
}

/*
registerCommands registers the /campfire command with Mattermost.
*/
func (p *Plugin) registerCommands() error {
	return p.API.RegisterCommand(&model.Command{
		Trigger:          "campfire",
		DisplayName:      "Campfire",
		Description:      "Open Campfire team operations.",
		AutoComplete:     true,
		AutoCompleteDesc: "Open Campfire or run a Campfire action.",
		AutoCompleteHint: "[standup | leave | time | report | settings | help]",
	})
}

/*
commandHelpResponse returns the default slash command help response.
*/
func (p *Plugin) commandHelpResponse() *model.CommandResponse {
	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeEphemeral,
		Text: strings.Join([]string{
			"🔥 **Campfire**",
			"",
			"Campfire is your team hub for standups, leave, task time, and reports.",
			"",
			"Available commands:",
			"- `/campfire standup`",
			"- `/campfire leave`",
			"- `/campfire time`",
			"- `/campfire report`",
			"- `/campfire settings`",
			"- `/campfire help`",
		}, "\n"),
	}
}

/*
commandActionResponse returns a short slash command response.
*/
func (p *Plugin) commandActionResponse(message string) *model.CommandResponse {
	return &model.CommandResponse{
		ResponseType: model.CommandResponseTypeEphemeral,
		Text:         "🔥 **Campfire**\n\n" + message,
	}
}

/*
main starts the Mattermost plugin process.
*/
func main() {
	plugin.ClientMain(&Plugin{})
}
