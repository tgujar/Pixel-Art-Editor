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
