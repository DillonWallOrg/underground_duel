package main

import (
    "underground_duel_server/utils"

	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}
var lastPlayerId uint16 = 0
var players = map[uint16]*Player{}
// Todo: make players array thread safe
var currTickId uint16 = 0
var avgTickDuration time.Duration = time.Duration(0)
const TPS = 30

func main() {
    setupEnvFile()
	setupLove()
	setupRoutes()
	go gameLoop()
	log.Fatal(http.ListenAndServeTLS(os.Getenv("SERVER_ADDR"), os.Getenv("CERT_FILE"), os.Getenv("KEY_FILE"), handlers.LoggingHandler(os.Stdout, http.DefaultServeMux)))
}

func setupEnvFile() {
    err := godotenv.Load(".env")
    if err != nil {
        log.Fatalf("Error loading .env file: %s", err)
    }
}

func setupLove() {
	// for bun to love pea forever
	//and for pea to reciprocate
	pea := 2
	bun := 2
	if pea < 3*bun {
		fmt.Println("bun is cutie")
	}
}

func setupRoutes() {
	http.HandleFunc("/", wsEndpoint)
}

func gameLoop() {
	lastTick := time.Now()
	targetDT := time.Duration(time.Second / TPS)
    last3Ticks := make([]time.Duration, 3)
    for i := range last3Ticks {
        last3Ticks[i] = targetDT
    }

	for {
		go tick()

		// Sleep if too fast
		now := time.Now()
		dt := now.Sub(lastTick)
		if dt < targetDT {
			time.Sleep(time.Duration(targetDT.Nanoseconds() - dt.Nanoseconds()))
		}
		// log.Println("TPS: ", 1/time.Now().Sub(lastTick).Seconds())
		lastTick = time.Now()
        last3Ticks[currTickId % 3] = lastTick.Sub(now)
        var sum int64 = 0
        for _, t := range last3Ticks {
            sum += t.Nanoseconds()
        }
        avgTickDuration = time.Duration(sum / 3)
	}
}

func tick() {
	tickInfo := TickInfo{}
    tickInfo.TickId = incrementTick()
	tickInfo.PlayerDatas = *asPlayerData(&players)
	for _, player := range players {
		player.ws.WriteJSON(tickInfo)
	}
}

func incrementTick() uint16 {
    currTickId++ // go doesn't throw an error when overflowing, just wraps to 0
    return currTickId
}

type TickInfo struct {
    TickId uint16
    PlayerDatas map[uint16]PlayerData
}

type PlayerData struct {
    MoveData MoveData
    AttackData AttackData
}

type Player struct {
    ws *websocket.Conn
    PlayerData
}

type MoveData struct {
    TickId uint16
    Velocity uint16
    Loc utils.Vec2D[int32]
    Dir utils.Vec2D[int32]
    PrevDir utils.Vec2D[int32]
}

type AttackData struct {
    Initialized bool
    TickId uint16
    Dir utils.Vec2D[int32]
}

type SocketMessage struct {
    MsgType string
}

func asPlayerData(players *map[uint16]*Player) *map[uint16]PlayerData {
	playerDatas := map[uint16]PlayerData{}
	for playerId, player := range *players {
		playerDatas[playerId] = PlayerData{player.MoveData, player.AttackData}
	}
	return &playerDatas
}

func wsEndpoint(w http.ResponseWriter, r *http.Request) {
	// upgrade HTTP conn to WebSocket
	ws, err := upgrader.Upgrade(w, r, nil)
	defer ws.Close()
	if err != nil {
		log.Println(err)
	}

	// Create player and assign player id
	player := new(Player)
	player.ws = ws
    lastPlayerId++ // assuming we wont have connections retain forever so overflow is okay
	players[lastPlayerId] = player
	defer delete(players, lastPlayerId)

	log.Println("Client connected!")
	err = ws.WriteMessage(websocket.TextMessage, []byte(fmt.Sprintf(`{"PlayerId":"%d"}`, lastPlayerId)))
	if err != nil {
		log.Println(err)
	}

	reader(ws, lastPlayerId)
}

// Listen forever for new messages
func reader(conn *websocket.Conn, playerId uint16) {
	for {
		// Read in a message
		_, p, err := conn.ReadMessage()
		if err != nil {
			log.Println(err)
			return
		}

		go handleMessage(p, conn, playerId)
	}
}

func handleMessage(msg []byte, conn *websocket.Conn, playerId uint16) {
	var jsonObject SocketMessage
	err := json.Unmarshal(msg, &jsonObject)
	if err != nil {
		log.Println(err)
		return
	}

	switch msgType := jsonObject.MsgType; msgType {
	case "move":
		var moveData MoveData
		err := json.Unmarshal(msg, &moveData)
		if err != nil {
			log.Println(err)
			return
		}

        moveData.addMovementPrediction()
        players[playerId].MoveData = moveData // Todo: check if playerId exists first
    case "attack":
        var attackData AttackData
        err := json.Unmarshal(msg, &attackData)
        if err != nil {
			log.Println(err)
            return
        }

        attackData.Initialized = true
		players[playerId].AttackData = attackData
    default:
		// Log and parrot the message we just read in
		log.Println(msgType)
		err = conn.WriteMessage(websocket.TextMessage, msg)
		if err != nil {
			log.Println(err)
			return
		}
	}
}

func (md *MoveData) addMovementPrediction() {
    deltaTicks := getDeltaTicks(md.TickId)
    dTimeSec := avgTickDuration.Seconds() * float64(deltaTicks)

    dLoc := md.Dir.Multiply(float64(md.Velocity) * dTimeSec).Round()
    newLoc := md.Loc.Add(dLoc)
    //log.Println(md.Loc, newLoc)
    md.Loc = *newLoc
}

func getDeltaTicks(prevTickId uint16) uint16 {
    if (prevTickId > currTickId) {
        // tickId has wrapped back to 0
        return math.MaxUint16 - prevTickId + currTickId
    }
    return currTickId - prevTickId
}
