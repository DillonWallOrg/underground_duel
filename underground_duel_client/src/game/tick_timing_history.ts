import { Settings } from "../settings/settings"

export class TickTimingHistory {
    public historyLength: number
    public latestTick: number | undefined
    private _timingHistory: number[]

    constructor(historyLength: number) {
        this.historyLength = historyLength
        this._timingHistory = new Array<number>(historyLength)

        if (!this.isPowerOf2(historyLength)) {
            throw new Error("TickTimingHistory length must be a power of 2")
        }
    }

    private isPowerOf2(x: number): boolean {
        return (Math.log(x)/Math.log(2)) % 1 === 0
    }

    public getTickTime(tickId: number): number {
        return this._timingHistory[tickId % this.historyLength]
    }

    private setTickTime(tickId: number, time: number) {
        this._timingHistory[tickId % this.historyLength] = time
    }

    private getTickDifference(olderTick: number, newerTick: number): number {
        if (newerTick < olderTick) {
            newerTick += Settings.network.maxTickNumber + 1 // 0 should be == maxTickNumber + 1
        }
        return newerTick - olderTick
    }

    public addTickTime(tickId: number) {
        const now = Date.now()

        if (this.latestTick !== undefined) {
            const tickDiff = this.getTickDifference(this.latestTick, tickId)
            if (tickDiff > 1) {
                // compensate for ticks that were missed (interpolate between then and now)
                const timeDiff = this.getTickTime(tickId) - this.getTickTime(this.latestTick)
                const timeStep = timeDiff / tickDiff
                let newTime = this.latestTick + timeStep
                for (let i = this.latestTick + 1; i < this.latestTick + tickDiff; i++) {
                    this.setTickTime(i, newTime)
                    newTime += timeStep
                }
            }
        }

        this.latestTick = tickId
        this.setTickTime(tickId, now)
    }
}
