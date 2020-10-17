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

class PixelEditor {
    constructor(state, config) {
        let {tools, controls, dispatch} = config;
        this.state = state;

        this.canvas = new PictureCanvas(state.picture, pos => {
            let tool = tools[this.state.tool];
            let onMove = tool(pos, this.state, dispatch);
            if (onMove) return pos => onMove(pos, this.state);
        });
        this.controls = controls.map(
            Control => new Control(state, config));
        this.dom = elt("div", {}, this.canvas.dom, elt("br"), 
                        ...this.controls.reduce((a, c) => a.concat(" ", c.dom), []));
    }
    syncState(state) {
        this.state = state;
        this.canvas.syncState(state.picture);
        for (let ctrl of this.controls) ctrl.syncState(state);
    }
}

class ToolSelect {
    constructor(state, {tools, dispatch}) {
        this.select = elt("select", {
            onchange: () => dispatch({tool: this.select.value})
        }, ...Object.keys(tools).map(name => elt("option", {
            selected: name == state.tool
        }, name)));
        this.dom = elt("label", null, "Tool: ", this.select);
    }
    syncState(state) { this.select.value = state.tool; }
}

class ColorSelect {
    constructor(state, {dispatch}) {
        this.input = elt("input", {
            type: "color",
            value: state.color,
            onchange: () => dispatch({color: this.input.value})
        });
        this.dom("label", null, "Color: ", this.input);
    }
    syncState(state) { this.input.value = state.color; }
}

function draw(pos, state, dispatch) {
    function drawPixel({x, y}, state) {
        let drawn = {x, y, color: state.color};
        dispatch({picture: state.picture.draw([drawn])});
    }
    drawPixel(pos, state);
    return drawPixel;
}

function rectangle(start, state, dispatch) {
    function drawRectangle(pos) {
        let xStart = Math.min(start.x, pos.x);
        let yStart = Math.min(start.x, pos.x);
        let xEnd = Math.max(start.x, pos.x);
        let yEnd = Math.max(start.x, pos.x);
        let drawn = [];
        for (let y = yStart; y <= yEnd; y++) {
            for (let x = xStart; x <= xEnd; x++) {
                drawn.push({x, y, color: state.color});
            }
        }
        dispatch({picture: state.picture.draw(drawn)});
    }
    drawRectangle(start);
    return drawRectangle;
}

const around = [{dx: -1, dy: 0}, {dx: 1, dy: 0},
                {dx: 0, dy: -1}, {dx: 0, dy: 1}];

function fill({x, y}, state, dispatch) {
    let targetColor = state.picture.pixel(x, y);
    let drawn = [{x, y, color: state.color}];
    for (let done = 0; done < drawn.length; done++) {
        for (let {dx, dy} of around) {
            let x = drawn[done].x + dx, y =drawn[done].y + dy;
            if (x >= 0 && x < state.picture.width &&
                y >= 0 && y < state.picture.height &&
                state.picture.pixel(x, y) == targetColor &&
                !drawn.some(p => p.x == x && p.y == y)) {
                    drawn.push({x, y, color: state.color})
                }
        }
    }
    dispatch({picture: state.picture.draw(drawn)});
}

function pick({x, y}, state, dispatch) {
    dispatch({color: state.picture.pixel(x, y)});
}

class SaveButton {
    constructor(state) {
        this.picture = state.picture;
        this.dom = elt("button", {
            onclick: () => this.save()
        }, "Save");
    }
    save() {
        let canvas = elt("canvas");
        drawPicture(this.picture, canvas, 1);
        let link = elt("a", {
            href: canvas.toDataURL(),
            download: "pixelart.png"
        });
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
    syncState(state) { this.picture = state.picture; }
}

class LoadButton {
    constructor (_, {dispatch}) {
        this.dom = elt("button", {
            onclick: () => startLoad(dispatch)
        }, "Load");
    }
    syncState() {}
}

function startLoad(dispatch) {
    let input = elt("input", {
        type: "file",
        onchange: () => finishLoad(input.files[0], dispatch)
    });
    document.body.appendChild(input);
    input.click();
    input.remove();
}

function finishLoad(file, dispatch) {
    if (file == null) return;
    let reader = new FileReader();
    reader.addEventListener("load", () => {
        let image = elt("img", {
            onload: () => dispatch({
                picture: pictureFromImage(image)
            }),
            src: reader.result
        });
    });
    reader.readAsDataURL(file);
}

function pictureFromImage(image) {
    let width = Math.min(100, image.width);
    let height = Math.min(100, image.height);
    let canvas = elt("canvas", {width, height});
    let cx = canvas.getContext("2d");
    cx.drawImage(image, 0, 0);
    let pixels = [];
    let {data} = cx.getImageData(0, 0, width, height);

    function hex(n) {
        return n.toString(16).padStart(2, "0");
    }

    for (let i = 0; i < data.length; i += 4) {
        let [r, g, b] = data.slice(i, i + 3);
        pixels.push("#" + hex(r) + hex(g) + hex(b));
    }
    return new Picture(width, height, pixels);
}
