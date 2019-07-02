# Matrix Github Bot

**Installation**
```bash
npm install
npm run oauth_server
# authenticate by going to localhost:4545/
# when finished, close the server
cp config-sample.json config.json
# edit config.json
npm run start
# github bot is now running
```

**Development**

All commands are prefixed with `!`, can be used in any room the bot is in. Add commands in `commands.js`. Scheduled jobs run on cron rules, they can be added via `schedule.js`. The actions of both commands and scheduled tasks run bound to the `MatrixClient` so `MatrixClient.client` as well as all other functionality (e.g. `markSeen` and `hasSeen`) are available via `this`.