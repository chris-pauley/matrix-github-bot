
const MatrixSDK = require("matrix-js-sdk");
const schedule = require("node-schedule");
const botCommands = require("./commands.js");
const botSchedule = require("./schedule.js");
const sql = require("sqlite3");

const config = require('./config.json');

class MatrixClient {
    constructor(matrix_user, matrix_access_token) {
        this.client = MatrixSDK.createClient({
            baseUrl:"https://matrix.v3x.pw",
            accessToken: matrix_access_token,
            userId: matrix_user
        });
        this.db = new sql.Database("./.matrix-client.db", (err)=>{
            if(err)
                console.error(err);
            else
                console.log("Connected to Sqlite");
        });
        this.setupChannels();
        this.setupScheduledTasks();
    }

    setupChannels(){
        this.channels = {};

        // set up channel aliases
        Object.entries(config.channel_aliases).forEach(([name, alias]) => {
            this.client.getRoomIdForAlias(`#${alias}:${config.matrix_homeserver}`)
                .then(({room_id})=>{
                    this.channels[name] = room_id;
                })
                .catch((err) => {
                    if(err.errcode == 'M_NOT_FOUND'){
                        // create channel
                        console.log(`Creating #${alias}`);
                        this.client.createRoom({
                            room_alias_name: alias,
                            visibility: 'public',
                            name: name,
                            invite: [config.matrix_owner_id]
                        }).then(({room_id}) => {
                            this.channels[name] = room_id;
                        });
                    }
                });
        });
    }

    setupScheduledTasks() {
        botSchedule.forEach((task,idx) => 
            schedule.scheduleJob(
                task.name || `task${idx}`,
                task.schedule,
                task.action.bind(this)
            )
        );
    }

    run() {
        this.client.once("sync", (state, prevState, data)=>{
            console.log(state);
            switch(state){
                case "PREPARED":
                    this.setupEvents();
                    break;
                default:
                    break;
            }
        });
        this.client.startClient();
    }

    setupCommands(commands) {
        this.commands = commands;
    }
    
    setupEvents() {
        // set up events
        this.client.on("Room.timeline", (event, room, paginate, removed, data) =>{
            let type = event.getType();
            if(paginate || !data.liveEvent || removed || type !== 'm.room.message')
                return;
            
            //const membership = room.getMyMembership();
            const is_dm = !!(room.getDMInviter());
            if (is_dm) {
                this.handleDirectMessage(event, room);
            } else {
                this.handleMessage(event, room);
            }
        });        
    }

    sendMessage(roomId, message) {
        return this.client.sendMessage(roomId, {
            format:"org.matrix.custom.html",
            formatted_body: message,
            body: '',
            msgtype: "m.text"
        });
    }

    respond(message) {
        return this.sendMessage(this._activeRoomId, message);
    }

    handleMessage(event, room) {
        let json = event.getContent() || {};
        const body = json.body || '';
        this._activeRoomId = room.roomId;
        for(let command in this.commands) {
            if(body.startsWith(`!${command} `)){
                this.commands[command].bind(this)(body.substr(body.indexOf(' ')));
            }
        }
    }

    handleDirectMessage(){

    }

    async markSeen(type, ids) {
        await this.ensureSeenTable(type);
        const stmt = this.db.prepare(`INSERT INTO ${type}_seen (id) VALUES (?)`);
        if(Array.isArray(ids)){
            ids.forEach(async (id)=>{
                await stmt.run(id);
            });
        } else {
            stmt.run(ids);
        }
        stmt.finalize();
    }

    async ensureSeenTable(type){
        try{
            await (new Promise((resolve,reject)=>{
                this.db.run(`CREATE TABLE IF NOT EXISTS ${type}_seen (id TEXT UNIQUE)`,()=>{
                    resolve();
                })
            }))
        } catch(e) {
            console.error(e);
        }
    }

    async hasSeen(type, id) {
        try {
            await this.ensureSeenTable(type);
            const hasSeen = await (new Promise((resolve,reject)=>{
                this.db.get(`SELECT id FROM ${type}_seen WHERE id=?`,[id],(err,row)=>{
                    if(err) {
                        reject(`DB Call failed: ${err}`);
                        return false;
                    }
                    resolve(!!row);
                });
            }));
            return hasSeen
        } catch(e) {
            console.error(e);
        }
        return false;
    }
}

const client = new MatrixClient(config.matrix_user, config.matrix_access_token);
function handle(sig){
    client.db.close();
    process.exit();
}
process.on('SIGINT', handle); process.on('SIGTERM', handle);
client.setupCommands(botCommands);
client.run();