// Ctor readonly size Vector2D
import { Settings } from "../../settings/settings.js";
import { Color } from "../color/color.js";
import { Vector2D } from "../math/vector2d.js";
export class Canvas {
    get element() {
        return this._elm;
    }
    get context() {
        return this._ctx;
    }
    constructor(size) {
        this.size = size;
    }
    awake() {
        const canvas = document.createElement("canvas");
        canvas.setAttribute("width", `${this.size.x}px`);
        canvas.setAttribute("height", `${this.size.y}px`);
        canvas.setAttribute("tabindex", "0");
        document.body.appendChild(canvas);
        this._elm = canvas;
        const ctx = this._elm.getContext("2d");
        if (!ctx) {
            throw new Error("Context identifier is not supported");
        }
        ctx.imageSmoothingEnabled = false;
        this._ctx = ctx;
    }
    setStyle(style) {
        for (const key in style) {
            if (!Object.hasOwnProperty.call(style, key)) {
                continue;
            }
            if (!style[key]) {
                continue;
            }
            this._elm.style[key] = style[key];
        }
    }
    fillRect(start, size, color) {
        this._ctx.beginPath();
        this._ctx.fillStyle = color.toString();
        this._ctx.rect(start.x, start.y, size.x, size.y);
        this._ctx.fill();
    }
    clearRect(start, size) {
        this._ctx.clearRect(start.x, start.y, size.x, size.y);
    }
    clearScreen() {
        this._ctx.clearRect(0, 0, this.size.x, this.size.y);
    }
    calcLocalPointFrom(globalPoint) {
        const canvasRect = this._elm.getBoundingClientRect();
        const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const offset = {
            top: canvasRect.top + scrollTop,
            left: canvasRect.left + scrollLeft,
        };
        const x = globalPoint.x - offset.left;
        const y = globalPoint.y - offset.top;
        if (x < 0 || y < 0) {
            return null;
        }
        if (x > offset.left + canvasRect.width || y > offset.top + canvasRect.height) {
            return null;
        }
        return Vector2D.divide(new Vector2D(x, y), Settings.video.scale);
    }
    drawText(text, position, color = new Color(255, 255, 255, 1), fontSize = 12, font = "Arial") {
        position = Vector2D.multiply(position, Settings.video.scale);
        this._ctx.font = `${fontSize}px ${font}`;
        this._ctx.fillStyle = color.toString();
        this._ctx.fillText(text, position.x, position.y);
    }
    drawImage(image, sLoc, sSize, dLoc, dSize) {
        dLoc = Vector2D.multiply(dLoc, Settings.video.scale);
        dSize = Vector2D.multiply(dSize, Settings.video.scale);
        this._ctx.drawImage(image, sLoc.x, sLoc.y, sSize.x, sSize.y, dLoc.x, dLoc.y, dSize.x, dSize.y);
    }
}
//# sourceMappingURL=canvas.js.map