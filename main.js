// represents the picture itself
class Picture {
    // picture object is represented by width, height  pixels
    // pixels are stores ad a flat array
    constructor(width, height, pixels) {
        this.width = width;
        this.height = height;
        this.pixels = pixels;
    }

    // empties the picture and fills it with the given color
    static empty(width, height, color) {
        let pixels = Array.from(width * height).fill(color);
        return new Picture (width, height, pixels)
    }

    // returns the color of the pixel
    pixels(x, y) {
        return this.pixels[y * this.width + x];
    }

    // updates the pixels array with the new values
    draw(pixels) {
        let copy = this.pixels.slice()
        // pixels must contain x, y and color props
        for (let {x, y, color} of pixels) {
            copy[y * width + x] = color;
        }
        return new Picture(this.width, this.height, copy);
    }   
}

// create an element of "type", with properties "prop" and "children"
function elt(type, props, ...children) {
    let elem = document.createElement(type);
    if (props) Object.assign(elem, props);
    for (let child of children) {
        if (typeof child !== "string") elem.appendChild(child);
        else elem.appendChild(document.createTextNode(child));
    }
    return elem;
}

const scale = 10;

class PictureCanvas {
    constructor(picture, pointerDown) {
        this.dom = elt("canvas", {
            onmousedown: event => this.mouse(event, pointerDown),
            ontouchstart: event => this.touch(event, pointerDown) 
        });
        this.syncState(picture);
    }
    mouse(event, onDown) {
        if (event.button !== 0) return;
        let pos = pointerPosition(event, this.dom);
        let onMove = onDown(pos);
        if (!onMove) return;
        let move = moveEvent => {
            if (mouseEvent.buttons === 0) {
                this.dom.removeEventListener("mousemove", move);
            } else {
                let newPos = pointerPosition(mouseEvent, this.dom);
                if (pos.x == newPos.x && pos.y == newPos.y) return;
                pos = newPos;
                onMove(pos);
            }
        }
        this.dom.addEventListener("mousemove", move);
    }

    touch(event, onDown) {
        let pos = pointerPosition(event.touches[0], this.dom);
        let onMove = onDown(pos);
        event.preventDefault();
        if (!onMove) return;
        let move = moveEvent => {
            let newPos = pointerPosition(moveEvent.touches[0], this.dom);
            if (newPos.x == pos.x && newPos.y == pos.y) return;
            pos = newPos;
            onMove(newPos); 
        }
        let end = () => {
            this.dom.removeEventListener("touchmove", move);
            this.dom.removeEventListener("touchend", end);
        };
        this.dom.addEventListener("touchmove", move);
        this.dom.addEventListener("touchend", end);
    }

    syncState(picture) {
        if (picture == this.picture) return;
        this.picture = picture;
        drawPicture(this.picture, this.dom, scale)
    }
}

function pointerPosition(pos, domNode) {
    let rect = domNode.getBoundingClientRect();
    return {
        x: Math.floor((pos.clientX - rect.left) / scale),
        y: Math.floor((pos.clientY - rect.top) / scale)
    }
}

function drawPicture(picture, canvas, scale) {
    canvas.width = picture.width * scale;
    canvas.height = picture.height * scale;
    let cx = canvas.getContext("2d");
    for (let x = 0; x < picture.height; x++) {
        for (let y = 0; y < picture.width; y++) {
            cx.fillStyle = picture.pixel(x, y);
            cx.fillRect(x * scale, y * scale, scale, scale);
        }
    }
}

