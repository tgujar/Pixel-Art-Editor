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
        let pixels = new Array(width * height).fill(color);
        return new Picture (width, height, pixels)
    }

    // returns the color of the pixel
    pixel(x, y) {
        return this.pixels[y * this.width + x];
    }

    // updates the pixels array with the new values
    draw(pixels) {
        let copy = this.pixels.slice()
        // pixels must contain x, y and color props
        for (let {x, y, color} of pixels) {
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                copy[y * this.width + x] = color;
            }
        }
        return new Picture(this.width, this.height, copy);
    }   
}

// create an element of "type", with properties "prop" and "children"
function elt(type, props, ...children) {
    let elem = document.createElement(type);
    if (props) Object.assign(elem, props);
    for (let child of children) {
        if (typeof child != "string") elem.appendChild(child);
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
            if (moveEvent.buttons === 0) {
                this.dom.removeEventListener("mousemove", move);
            } else {
                let newPos = pointerPosition(moveEvent, this.dom);
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
        drawPicture(picture, this.dom, scale, this.picture);
        this.picture = picture;
    }
}

function pointerPosition(pos, domNode) {
    let rect = domNode.getBoundingClientRect();
    return {
        x: Math.floor((pos.clientX - rect.left) / scale),
        y: Math.floor((pos.clientY - rect.top) / scale)
    }
}

function drawPicture(picture, canvas, scale, previous) {
    if (!previous) {
        canvas.width = picture.width * scale;
        canvas.height = picture.height * scale;
    }
    let cx = canvas.getContext("2d");
    for (let y = 0; y < picture.height; y++) {
        for (let x = 0; x < picture.width; x++) {
            if (previous && (picture.pixel(x, y) == previous.pixel(x, y))) continue;
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
        this.dom = elt("div", {
            tabIndex: 0,
            onkeydown: (event) => {
                console.log(event.key);
                let shortcut = Object.keys(tools).find(name => event.key.toLowerCase() == name[0].toLowerCase())
                if (shortcut) {
                    dispatch({tool: shortcut});
                } else if (event.ctrlKey && event.key.toLowerCase() == "z") {
                    dispatch({undo: true});
                }
            }
        }, this.canvas.dom, elt("br"), 
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
        this.dom = elt("label", null, "Color: ", this.input);
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
        let yStart = Math.min(start.y, pos.y);
        let xEnd = Math.max(start.x, pos.x);
        let yEnd = Math.max(start.y, pos.y);
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

function circle(start, state, dispatch) {
    function drawCircle(pos) {
        let radius = Math.round(Math.sqrt((start.x - pos.x)**2 + (start.y - pos.y)**2));
        let xStart = start.x - radius;
        let yStart = start.y - radius;//Math.min(start.y, pos.y);
        let xEnd = start.x + radius;
        let yEnd = start.y + radius;
        let drawn = [];
        for (let y = yStart; y <= yEnd; y++) {
            for (let x = xStart; x <= xEnd; x++) {
                if ((y - start.y)**2 + (x - start.x)**2 <= radius**2) {
                    drawn.push({x, y, color: state.color});
                }
            }
        }
        dispatch({picture: state.picture.draw(drawn)});
    }
    drawCircle(start);
    return drawCircle;
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

function historyUpdateState(state, action) {
    if (action.undo == true) {
        if (state.done.length == 0) return state;
        return Object.assign({}, state, {
            picture: state.done[0],
            done: state.done.slice(1),
            doneAt: 0
        });
    } else if (action.picture && state.doneAt < Date.now() - 1000) {
        return Object.assign({}, state, action, {
            done: [state.picture, ...state.done],
            doneAt: Date.now()
        });
    } else {
        return Object.assign({}, state, action);
    }
}

class UndoButton {
    constructor(state, {dispatch}) {
        this.dom = elt("button", {
            onclick: () => dispatch({undo: true}),
            disabled: state.done.length == 0
        }, "Undo");
    }
    syncState(state) {
        this.dom.disabled = state.done.length == 0;
    }
}

const startState = {
    tool: "draw",
    color: "#000000",
    picture: Picture.empty(60, 30, "#f0f0f0"),
    done: [],
    doneAt: 0
}

const baseTools = {draw, fill, rectangle, circle, pick};

const baseControls = [
    ToolSelect, ColorSelect, SaveButton, LoadButton, UndoButton
];

function startPixelEditor({state = startState,
                            tools = baseTools,
                            controls = baseControls}) {
    let app = new PixelEditor(state, {
        tools,
        controls,
        dispatch(action) {
            state = historyUpdateState(state, action);
            app.syncState(state);
        }
    });
    return app.dom;
}

document.querySelector("div").appendChild(startPixelEditor({}));