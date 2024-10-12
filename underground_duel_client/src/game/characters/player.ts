import { Vector2D } from "../../utils/math/vector2d.ts"
import { PlayerKeyPressComponent } from "./components/player_keypress_component.ts"
import { Settings } from "../../settings/settings.ts"
import { Camera } from "../camera.ts"
import { Character } from "./character.ts"
import { SpriteSheet } from "./sprite/spritesheet.ts"

export class Player extends Character {
    private _webSocket: WebSocket
    public lastTickId: number = 0

	constructor(playerSpriteSheet: SpriteSheet, loc: Vector2D, webSocket: WebSocket) {
		super(playerSpriteSheet, loc, Settings.player.moveSpeed, Settings.canvas.playerLayer, false, false)

        this._webSocket = webSocket
		this.addUpdateComponent(new PlayerKeyPressComponent(this))
		Camera.setTarget(this.pixelPerfectArea_c)
	}

	public update(deltaTime: number): void {
		super.update(deltaTime)

        // only send data if moving or we just stopped moving
        if (this.movement_c.velocity != 0 || !Vector2D.areEqual(this.movement_c.moveDirection, this.movement_c.prevMoveDirection)) {
            const moveData = {
                MsgType: "move",
                TickId: this.lastTickId,
                Velocity: this.movement_c.velocity,
                Loc: {
                    X: this.pixelPerfectArea_c.loc.X,
                    Y: this.pixelPerfectArea_c.loc.Y,
                },
                Dir: {
                    X: this.movement_c.moveDirection.X,
                    Y: this.movement_c.moveDirection.Y,
                },
                PrevDir: {
                    X: this.movement_c.prevMoveDirection.X,
                    Y: this.movement_c.prevMoveDirection.Y,
                }
            }
            this._webSocket.send(JSON.stringify(moveData))
        }

        if (this.justAttacked) {
            const attackData = {
                MsgType: "attack",
                TickId: this.lastTickId,
                Dir: {
                    X: this.attackDir.X,
                    Y: this.attackDir.Y,
                }
            }
            this._webSocket.send(JSON.stringify(attackData))
            this.justAttacked = false
        }

		Camera.update()
	}
}
