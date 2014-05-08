// Modified by JR, 2013-11-15
// adding matrix convolution

function math_calc_gradient(matrix, width, height, BYTES_PER_PIXEL) {  // gradient occupies 1 byte/pixel, but each matrix value (pixel) occupies n bytes. width is # of image width
    if (BYTES_PER_PIXEL == undefined)
        BYTES_PER_PIXEL = 1;
    var length = width * height * BYTES_PER_PIXEL;  // this is array length (width x height x 4)

    // calculate [gradient_x, gradient_y] = gradient(im)
    var gradient_x = new Array(length);
    var gradient_y = new Array(length);       // this is "sparse" matrix, to match the image (4 bytes per pixel)
    var numElements = length / BYTES_PER_PIXEL;  // # of elements of matrix

    for (var i = 0, data = matrix; i < numElements; i++) {
        var index = i * BYTES_PER_PIXEL;
        var index_right = index + BYTES_PER_PIXEL; // very right column
        var index_left = index - BYTES_PER_PIXEL;

        if (i % width == 0) {
            gradient_x[i] = data[index_right] - data[index];  // very first column
        }
        else if (((i+1) % width) == 0) {  // very last column
            gradient_x[i] = data[index] - data[index_left];
        }
        //else if (((i) % (width - 1)) == 0) { // special case, the very last column,
          //  gradient_x[i] = -data[index_left] + data[index];
        //}
        else {  // uses convolution of [0.5 0 -0.5]
            gradient_x[i] = ((data[index] - data[index_left]) + (data[index_right] - data[index])) / 2;
        }
        var index_down = index + (width * BYTES_PER_PIXEL);  // right below
        var index_up = index - (width * BYTES_PER_PIXEL);  // right below
        //if ((index_down >> 2) % (height - 1) == 0 && index_down > 0) {  // special case the very last column, 
        if (index_up < 0) {  // special case, very top row and very bottom row
            gradient_y[i] = data[index_down] - data[index];
        }
        else if (index_down >= length) { // very bottom row
            gradient_y[i] = -data[index_up] + data[index];
        }
        else {
            gradient_y[i] = ((data[index] - data[index_up]) + (data[index_down] - data[index])) / 2;
        }

    }
    return { "gradient_x": gradient_x, "gradient_y": gradient_y };
}


function math_linear_interpolation(fx2d, ncol, nrow, x, y, BPP) {       // fx2d, width, height
    if (!fx2d) return 0;
    if (fx2d.length == 0) return 0;

    if (BPP == undefined)
        BPP = 1;    // bytes per pixel

    var index = y * ncol * BPP + x;

    var x1 = parseInt(x);
    var x2 = parseInt(parseFloat(x) + 1);
    var y1 = parseInt(y);
    var y2 = parseInt(parseFloat(y) + 1); // *4 is for: fx2d is 4 bytes per pixel

    if (x2 >= ncol)  // went over column
        x2 = ncol;

    if (y2 > nrow)
        y2 = nrow - 1;

    var Q11 = parseFloat(fx2d[BPP * (x1 + y1 * ncol)]);
    var Q21 = parseFloat(fx2d[BPP * (x1 + y2 * ncol)]);
    var Q12 = parseFloat(fx2d[BPP * (x2 + y1 * ncol)]);
    var Q22 = parseFloat(fx2d[BPP * (x2 + y2 * ncol)]);
    if (x2 - x1 == 0 || y2 - y1 == 0)
        return Q11;
    var val = 1 / ((x2 - x1) * (y2 - y1));
    val = val * (Q11 * (x2 - x) * (y2 - y) + Q12 * (x - x1) * (y2 - y) + Q21 * (x2 - x) * (y - y1) + Q22 * (x - x1) * (y - y1));

    return val;

}


function HSVtoRGB(h, s, v, opacity, returnAsArray) {
    // inputs h=hue=0-360, s=saturation=0-1, v=value=0-1
    // algorithm from Wikipedia on HSV conversion
    // Adapted from http://www.easyrgb.com/math.html
    // hsv values = 0 - 1, rgb values = 0 - 255
    var r, g, b;
    var RGB = new Array();
    if (s == 0) {
        RGB['red'] = RGB['green'] = RGB['blue'] = Math.round(v * 255);
    } else {
        // h must be < 1
        var var_h = h * 6;
        if (var_h == 6) var_h = 0;
        //Or ... var_i = floor( var_h )
        var var_i = Math.floor(var_h);
        var var_1 = v * (1 - s);
        var var_2 = v * (1 - s * (var_h - var_i));
        var var_3 = v * (1 - s * (1 - (var_h - var_i)));
        if (var_i == 0) {
            var_r = v;
            var_g = var_3;
            var_b = var_1;
        } else if (var_i == 1) {
            var_r = var_2;
            var_g = v;
            var_b = var_1;
        } else if (var_i == 2) {
            var_r = var_1;
            var_g = v;
            var_b = var_3
        } else if (var_i == 3) {
            var_r = var_1;
            var_g = var_2;
            var_b = v;
        } else if (var_i == 4) {
            var_r = var_3;
            var_g = var_1;
            var_b = v;
        } else {
            var_r = v;
            var_g = var_1;
            var_b = var_2
        }
    }
    //rgb results = 0 ÷ 255  
    RGB['red'] = Math.round(var_r * 255);
    RGB['green'] = Math.round(var_g * 255);
    RGB['blue'] = Math.round(var_b * 255);

    r = RGB['red'];
    g = RGB['green'];
    b = RGB['blue'];

    if (returnAsArray) {
        return [r, g, b];
    }
    else {
        if (opacity) {
            return "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
        } else {
            return "#" + r.toString(16) + g.toString(16) + b.toString(16);
        }
    }


    //  At this point r,g,b are in 0...1 range.  Now convert into rgba or #FFFFFF notation
    //if (opacity) {
    //  return "rgba(" + Math.round(255 * r) + "," + Math.round(255 * g) + "," + Math.round(255 * b) + "," + opacity + ")";
    //} else {
    //return "#" + parseInt(r * 255).toString(16) + parseInt(g * 255).toString(16) + parseInt(b * 255).toString(16);
    //}
}
