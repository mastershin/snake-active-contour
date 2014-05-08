var snake1;

var WIDTH = 300;
var HEIGHT = 300;

var image_width;        // this should be used for all 1D array!
var image_height;

var layer_orig_image;
var layer_orig_image_grayscale;     // grayscale version, for optimization.
var layer_image_gaussian;
var layer_image_line_functional;
var layer_image_edge_functional;
var layer_image_term_functional;        // not implemented yet
var layer_total_energy;         // displays entire energy sum, as heatmap

var energy_spline = [];              // 2d array of energy values based on each pixel
var energy_line_functional = [];     // 2D array of energy values 0 to 1
var energy_edge_functional = [];
var energy_term_functional = [];
var energy_volcano = [];        // 2d array of energy value, based on each pixel

var force_spline = [];          // 2D array of force vector  (R is x, G is y unit vector, B is a length)
var force_fields = [];       // 2D array of force vector. uses 4 bytes per pixel like RGB. (R is x, G is y unit vector, B is a length)

var energy_total = [];     // contains total energy
var energy_gradient = { gradient_x: [], gradient_y: [], width: 0, height: 0 };        // gradient of energy (image forces)

var layer_volcano;      // a layer that contains VOLCANO
var layer_volcano_energy;   // draws energy heatmap
var layer_control_point;    // a layer that contains control point (user selected)
var stage;
var line_func, edge_func, term_func;        // energy functional
var gaussian;

//var ghostcanvas;        // this contains original image, used to read pixel value.
var bg_img;
var bg_imgloc;
var bg_img_gaussian;

var canvas_width;
var canvas_height;

//var ctx;

//var controlPoints = []; // = [50, 100, 350, 50, 300, 200, 150, 300, 20, 150];
var xs, ys;

var lastControlPointDragged = false;
var volcanoDragged = false;

var xs_vertical, ys_vertical;  // vertical matrix (but, actually 1-D array for performance reason)


/*
function print_matrix_1d(m, nrow, ncol) {
    var msg = '';
    for (var i = 0; i < length(m) ; i++) {
        if (i % ncol == 0 && i > 0) msg += '\n';
        msg += m[i] + ' ';
    }
    console.log(msg);
}
*/

//function matrix_multiply_scalar(matrix, scalar) {

//    var dimension = numeric.dim(matrix);
//    var nrow = dimension[0];
//    var ncol = dimension[1];

//    for (var row = 0; row < nrow; row++) {
//        for (var col = 0; col < ncol; col++) {
//            matrix[row][col] *= scalar;
//        }
//    }
//    return matrix;
//}

/*
// return nrow x ncol zero matrix. 1d means 1 dimensional array
function matrix1d_zeros(nrow,ncol) {
    var matrix = [];
    for(var i = nrow * ncol - 1; i >= 0; i-- )
        matrix[i] = 0;
    return matrix;
}
*/

// setup pentadiagonal matrix
function initialize_snake() {
    snake1.init(getSnakeAlpha(), getSnakeBeta(), getSnakeGamma(), isOpenSnake(), energy_gradient, WIDTH, HEIGHT);  // if there's no image, use canvas's image!
}


// apply a convolution matrix
// returns a NEW image, instead of modifying existing one
// matrix is a ONE-DIMENSIONAL matrix, and must be same row & same height (for performance reason)
function applyMatrixReturnNew(img, matrix, amount, c_width, c_height) {

    // create a second buffer to hold matrix results
    var buffer2 = document.createElement("canvas");
    // get the canvas context
    var c2 = buffer2.getContext('2d');

    // set the dimensions
    c2.width = buffer2.width = img.width;
    c2.height = buffer2.height = img.height;

    // draw the image to the new buffer
    if (img instanceof Image)
        c2.drawImage(img, 0, 0, img.width, img.height);
    else
        c2.putImageData(img, 0, 0);  // img is from getImageData()

    var bufferedPixels = c2.getImageData(0, 0, c_width, c_height)

    // now create RETURNable pixel
    var retbuffer = document.createElement("canvas");
    var retctx = retbuffer.getContext('2d');
    retctx.width = retbuffer.width = img.width;
    retctx.height = retbuffer.height = img.height;
    if (img instanceof Image)
        retctx.drawImage(img, 0, 0, img.width, img.height);
    else
        retctx.putImageData(img, 0, 0);
    var pixels = retctx.getImageData(0, 0, c_width, c_height)

    // speed up access
    var data = pixels.data, bufferedData = bufferedPixels.data, imgWidth = img.width;

    // make sure the matrix adds up to 1
    /* 		matrix = normalizeMatrix(matrix); */

    // calculate the dimensions, just in case this ever expands to 5 and beyond
    var matrixSize = Math.sqrt(matrix.length);

    // loop through every pixel
    for (var i = 1; i < imgWidth - 1; i++) {
        for (var j = 1; j < img.height - 1; j++) {

            // temporary holders for matrix results
            var sumR = sumG = sumB = 0;

            // loop through the matrix itself
            for (var h = 0; h < matrixSize; h++) {
                for (var w = 0; w < matrixSize; w++) {

                    // get a refence to a pixel position in the matrix
                    var r = convertCoordinates(i + h - 1, j + w - 1, imgWidth) << 2;

                    // find RGB values for that pixel
                    var currentPixel = {
                        r: bufferedData[r],
                        g: bufferedData[r + 1],
                        b: bufferedData[r + 2]
                    };

                    // apply the value from the current matrix position
                    sumR += currentPixel.r * matrix[w + h * matrixSize];
                    sumG += currentPixel.g * matrix[w + h * matrixSize];
                    sumB += currentPixel.b * matrix[w + h * matrixSize];
                }
            }

            // get a reference for the final pixel
            var ref = convertCoordinates(i, j, imgWidth) << 2;
            var thisPixel = {
                r: data[ref],
                g: data[ref + 1],
                b: data[ref + 2]
            };

            // finally, apply the adjusted values
            data = setRGB(data, ref,
                findColorDifference(amount, sumR, thisPixel.r),
                findColorDifference(amount, sumG, thisPixel.g),
                findColorDifference(amount, sumB, thisPixel.b));
        }
    }

    // code to clean the secondary buffer out of the DOM would be good here

    return (pixels);
}

function initCanvas(divId, width, height) {
    return new Kinetic.Stage({
        container: divId,
        width: width,
        height: height
    });

}

window.onload = function () {



    // testing. working ok. 2013-11-20
    //var energy_total = [ [10, 12, 15, 16, 22, 25],[20, 21, 22, 23, 24, 25],[26, 27, 28, 29, 30, 31] ];
    //var energy_total = [10, 12, 15, 16, 22, 25, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
    //var energy_total = [10, 15, 45, 20, 21, 22, 26, 27, 44];
    //var gradient = math_calc_gradient(energy_total, 3, 3, 1);
    //print_matrix([gradient.gradient_x]);
    //print_matrix([gradient.gradient_y]);






    WIDTH = $('#canvasFrame').innerWidth();
    HEIGHT = $('#canvasFrame').innerHeight();
    stage = initCanvas('canvasFrame', WIDTH, HEIGHT);
    line_func = initCanvas('line_func', WIDTH, HEIGHT);
    edge_func = initCanvas('edge_func', WIDTH, HEIGHT);
    term_func = initCanvas('term_func', WIDTH, HEIGHT);
    total_energy = initCanvas('total_energy', WIDTH, HEIGHT);
    gaussian = initCanvas('gaussian', WIDTH, HEIGHT);

    $(stage.getContent()).on('click', function (e) {

        var mouseXY = stage.getMousePosition();

        if ($('#clickmode').val() == 'add_control_point') {   // Click Mode == Add Control Point
            if (snake1.isLastControlPointDragged() || volcanoDragged) {
                volcanoDragged = false;
                return;
            }

            //e = e || window.event;
            //e.preventDefault();
            //e.stopPropagation();


            // add Anchor control point
            var pointsPerLine = $('#bezier_slider_textbox').val();
            snake1.addControlPoint(mouseXY.x, mouseXY.y, pointsPerLine);

            initialize_snake();
        }
        else if ($('#clickmode').val() == 'spring') {   // Click Mode == Add Spring

            var min_distance = 999999999;
            var closest_child = -1;
            var children = layer_control_point.getChildren();
            for (var i = 0; i < children.length; i++) {
                var x = children[i].getX();
                var y = children[i].getY();
                var dx = mouseXY.x - x;
                var dy = mouseXY.y - y;
                var dist = dx * dx + dy * dy;
                if (dist < min_distance) {
                    min_distance = dist;
                    closest_child = i;
                }
            }
            if (closest_child != -1) {
                snake1.moveControlPoint(closest_child, mouseXY.x, mouseXY.y);
                //children[closest_child].setX(mouseXY.x);
                //children[closest_child].setY(mouseXY.y);
            }
        }

        //cp.on('click', function (e) {
        //    e.preventDefault();
        //});

        snake1.redraw();

        //drawSnake(energy_spline, force_spline, image_width, image_height);


        //layer_control_point.draw();











    });



    canvas_width = WIDTH; // layer_snake.getCanvas().width;
    canvas_height = HEIGHT; // layer_snake.getCanvas().height;
    //ctx = layer_snake.getContext(); // .getCanvas().getContext();

    layer_control_point = new Kinetic.Layer();  // contains initial user control points
    stage.add(layer_control_point);

    layer_volcano_energy = new Kinetic.Layer();
    stage.add(layer_volcano_energy);

    layer_volcano = new Kinetic.Layer();        // this is a dragged image layer
    stage.add(layer_volcano);


    layer_orig_image = new Kinetic.Layer();
    stage.add(layer_orig_image);

    layer_orig_image_grayscale = new Kinetic.Layer();
    stage.add(layer_orig_image_grayscale);
    layer_orig_image_grayscale.hide();

    layer_image_gaussian = new Kinetic.Layer();
    gaussian.add(layer_image_gaussian);

    layer_image_line_functional = new Kinetic.Layer();
    //stage.add(layer_image_line_functional);
    line_func.add(layer_image_line_functional);

    layer_image_edge_functional = new Kinetic.Layer();
    //stage.add(layer_image_edge_functional);
    edge_func.add(layer_image_edge_functional);

    layer_image_term_functional = new Kinetic.Layer();
    //stage.add(layer_image_term_functional);
    term_func.add(layer_image_term_functional);

    layer_total_energy = new Kinetic.Layer();
    total_energy.add(layer_total_energy);


    layer_orig_image.setZIndex(1);
    layer_orig_image_grayscale.setZIndex(2);
    layer_image_gaussian.setZIndex(5);
    layer_image_line_functional.setZIndex(10);
    layer_image_edge_functional.setZIndex(20);
    layer_image_term_functional.setZIndex(30);
    layer_total_energy.setZIndex(40);

    layer_volcano_energy.setZIndex(100);
    layer_volcano.setZIndex(200);



    layer_control_point.setZIndex(990);

    var con = stage.getContent();
    var dragSrcEl = null;

    $('#volcano').on({      // this is initial icon outside the HTML5 canvas
        dragstart: function (e) {
            dragSrcEl = this;       // user started dragging volcano
            volcanoDragged = true;
        },
    });

    con.addEventListener('dragover', function (e) { e.preventDefault(); });     // important to call this.

    // actually insert image to stage
    con.addEventListener('drop', function (e) {
        var volcano = new Kinetic.Image({
            draggable: true
        });

        volcano.setX(e.offsetX - 32);
        volcano.setY(e.offsetY - 37);

        layer_volcano.add(volcano);

        imageObj = new Image();
        imageObj.src = dragSrcEl.src;
        imageObj.onload = function () {
            volcano.setImage(imageObj)
            layer_volcano.draw();
            drawVolcanoEnergy();
        };
        volcano.on('dragstart', function (e) {
            volcanoDragged = true;
        });
        volcano.on('dragmove', function (e) {
            drawVolcanoEnergy();        // draws heatmap in real time
        });


    });


    var snakeGraphicsEngine = new SnakeKineticEngine();
    snakeGraphicsEngine.init(layer_control_point);
    snake1 = new Snake(snakeGraphicsEngine);

    doOneSnakeIterationOnTimer();       // this starts snake iteration

    
};  // end window.onload

//var JSImage = (typeof exports === "undefined") ? (function JSImage() { }) : (exports);
//if (typeof global !== "undefined") { global.JSImage = JSImage; }
/*
var JSImage = function (img, width, height) {
    var me = this;

    me.version = "1.0";
    me.sourceFormat = "kineticjs";

    me._pixels = [];
    me._width = 0;
    me._height = 0;
    me._img = null;     // may contain various image type
   
    me.loadImage = function (img, width, height) {
        me._width = width;
        me._height = height;
        me._img = img;

        if (img instanceof Image) {
            me._img = img;
            me._pixels = me._img.getImageData(0, 0, width, height);
        }
        else if (img instanceof JSImage) {
            if (width === undefined) {
                width = img._img.width;     // copy width & height
                height = img._img.height;
            }
            var tmp = img._img.getImageData(0, 0, width, height);
            me._img = img._img.getContext('2d');
            me._pixels = me._img.getImageData(0, 0, width, height);
            //var buffer2 = document.createElement("canvas");
            // get the canvas context
            //var temp_ctx = buffer2.getContext('2d');

        }
        else if (img instanceof Kinetic.Layer) {            
            me._img = img.getContext('2d');
            me._pixels = me._img.getImageData(0, 0, width, height);
        }
        else
            throw("img error type");
    }
    me.prototype = function (img, width, height) {
        console.log('constructor called');
        this.loadImage(img, width, height);
    };
    me.pixels = function () {
        return me._pixels;
    }
    me.updatePixels = function () {
        //if (JSImage._img instanceof Kinetic.Layer) {
        me._img.putImageData(me._pixels, 0, 0);
        //}
    }

    me.loadImage(img, width, height);
}
*/
/*
    var p = new Parallel([1, 2, 3, 4], { arraySize: length, data: pixels.data, min_intensity: min_intensity, max_intensity: max_intensity });

    p.map(function (d) {
        var length = this.arraySize;
        var data = this.data;

        switch (d) {
            case 1:

                var start = 0, end = (length >> 2) / 4;
                for (var i = start; i < end; i++) {
                    value = data[i << 2];
                    if (this.max_intensity < value)
                        this.max_intensity = value;
                    if (this.min_intensity > value)
                        this.min_intensity = value;
                }
                break;
            case 2:
                var start = (length >> 2) / 4, end = (length >> 2) * 2;
                for (var i = start; i < end; i++) {
                    value = data[i << 2];
                    if (this.max_intensity < value)
                        this.max_intensity = value;
                    if (this.min_intensity > value)
                        this.min_intensity = value;
                }
                break;
            case 3:
                var start = (length >> 2) * 2, end = (length >> 2) * 3 / 4;
                for (var i = start; i < end; i++) {
                    value = data[i << 2];
                    if (this.max_intensity < value)
                        this.max_intensity = value;
                    if (this.min_intensity > value)
                        this.min_intensity = value;
                }
                break;
            case 4:
                var start = (length >> 2) * 3 / 4, end = (length >> 2);
                for (var i = start; i < end; i++) {
                    value = data[i << 2];
                    if (this.max_intensity < value)
                        this.max_intensity = value;
                    if (this.min_intensity > value)
                        this.min_intensity = value;
                }
                break;
        }
    }).then(function () {
    */

// destRGB must be RGBA format, where each pixel occupies 4 array cells, since it needs to display heatmap.
function doLineFunctional(gaussian_img, destRGB, width, height) {
    
    __doLineFunctional(bg_img_gaussian, layer_image_line_functional.getContext("2d"), image_width, image_height, "grayscale");
}
function __doLineFunctional(gaussian_img, destRGB, width, height, colorMode) {
    var isHeatmap = colorMode === 'heatmap';
    
    //////////////////////////////////////////////////
    var isRGBA = true;      // if true, each pixel in gaussian_img occupies 4 cells. Otherwise, 1 index cell per pixel
    var idxStep = isRGBA ? 4 : 1;       // this applies to original image... should be always 4, but, in case of 8 bit per pixel, this would be '1'.

    var pixels;
    //if (gaussian_img instanceof Kinetic.Layer) {      // now it passes actual getImageData()
        //pixels = gaussian_img.getContext('2d').getImageData(0, 0, width, height);
    //}

    pixels = gaussian_img;
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    if (energy_line_functional.length != pixels.data.length / idxStep)
        energy_line_functional = new Array(pixels.data.length / idxStep);

    

    var max_intensity = -1;
    var min_intensity = 256;
    var value;
    



    for (var i = 0, data = pixels.data, length = data.length; i < length; i += idxStep) {
        value = data[i];
        if (max_intensity < value)
            max_intensity = value;
        if (min_intensity > value)
            min_intensity = value;
    }

    var slope = max_intensity - min_intensity;
    if (slope < 0.00001) slope = 0.00001;

    var wl = get_wl();
    //if (!isShowLineFunctional()) wl = 0;

    // the main loop through every pixel to apply the simpler effects
    // (data is per-byte, and there are 4 bytes per pixel, so only loop through each pixel and save a few cycle)
    if (wl != 0)
        for (var i = 0, data = pixels.data, length = data.length; i < length; i += idxStep) {
            var e_index = i / idxStep;

            var e_line = wl * data[i];
            e_line = ((e_line - min_intensity) / slope);

            energy_line_functional[e_index] = e_line;         // save energy value. ranges from 0 to 1

            if (isHeatmap) {
                e_line = e_line * (240 / 360);        // scales down for temperature display
                var hue = 240 / 360 - e_line;       // inverse color spectrum. 0 is red, 240/360 is blue...
                if (hue < 0) hue = 0;
                var colorArray = HSVtoRGB(hue, 1, 1, 1, true);     // 1=opacity, true == return as 3 element array
                data[i] = colorArray[0];      // r
                data[i + 1] = colorArray[1];  // g
                data[i + 2] = colorArray[2];  // b
            }
            else {
                var intensity = e_line * 255;
                data[i] = intensity;
                data[i + 1] = intensity;
                data[i + 2] = intensity;
                data[i + 3] = 255;          // alpha
            }

        }
    ///////////////////////////////////////////////////////////////////////////////////////////////////



    destRGB.fill(width, height);
    destRGB.putImageData(pixels, 0, 0);
}
function doEdgeFunctional() {
    __doEdgeFunctional(bg_img_gaussian, layer_image_edge_functional.getContext("2d"), image_width, image_height, "grayscale");
}
function __doEdgeFunctional(gaussian_img, destRGBLayer, width, height, colorMode) {
    var isHeatmap = colorMode === 'heatmap';

    //////////////////////////////////////////////////
    var isRGBA = true;      // if true, each pixel in gaussian_img occupies 4 cells. Otherwise, 1 index cell per pixel
    var idxStep = isRGBA ? 4 : 1;       // this applies to original image... should be always 4, but, in case of 8 bit per pixel, this would be '1'.
    
    destRGBLayer.putImageData(gaussian_img, 0, 0);      // copy gaussian image --> destination
    var destPixel = destRGBLayer.getImageData(0, 0, image_width, image_height);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    if (energy_edge_functional.length != destPixel.data.length / idxStep)
        energy_edge_functional = new Array(destPixel.data.length / idxStep);

    var index_left, index_right, index_above, index_below;

    

    var size = width * height;
    //var grad = math_calc_gradient(destPixel.data, width, height, 4);  // pixels.data is 4 bytes per pixel, and grad is 1 byte/pixel
    var gradient_x = new Array(size);
    var gradient_y = new Array(size);
    var gradient_mag = new Array(size);


    var kernel_x = [            // scharr - very close to Sobel, but, Scharr is rotationally symmetric
                      3, 0,-3,
                     10, 0,-10,
                      3, 0,-3,
    ];

    var kernel_y = [ 
                      3, 10, 3,
                      0,  0, 0,
                     -3,-10,-3,
    ];
/*
    var kernel_x = [            // Sobel
                      1, 0, -1,
                      2, 0, -2,
                      1, 0, -1,
    ];
    var kernel_y = [
                      1, 2, 1,
                      0, 0, 0,
                     -1,-2,-1,
    ];
*/
    applyMatrixImageToDouble(gaussian_img, width, height, gradient_x, kernel_x, false);
    applyMatrixImageToDouble(gaussian_img, width, height, gradient_y, kernel_y, false);

    //applyMatrix(gaussian_img, destPixel, scharr_x, 2.0, width, height);     // 2.0 means edge amount
    //for (var i = 0; i < width*height; i++) {
    //    gradient_x[i] = destPixel[i*4];
    //}

    //applyMatrix(gaussian_img, destPixel, scharr_y, 2.0, width, height);     // 2.0 means edge amount
    //for (var i = 0; i < width*height; i++) {
    //    gradient_x[i] = destPixel[i*4];
    //}
    
    var we = get_we();
    //if (!isShowEdgeFunctional()) we = 0;        // if not checked, then it's ZERO.

    var min_energy = 999999, max_energy = -999999;
    //for (var i = 0, data = destPixel.data, length = data.length; i < length; i += idxStep) {
    for (var i = 0; i < size; i ++) {
        var index = i;
        var gx = gradient_x[index], gy = gradient_y[index];
        var mag = Math.sqrt(gx * gx + gy * gy);
        gradient_mag[index] = mag;

        var e_edge = -mag;
        energy_edge_functional[index] = e_edge;


        if (min_energy > e_edge) min_energy = e_edge;
        if (max_energy < e_edge) max_energy = e_edge;

        
    }


    var slope = max_energy - min_energy;
    if (slope < 0.0001) {
        slope = 0.0001;
    }
    
    var e_edge = 0;    
    for (var i = 0, data = destPixel.data, length = data.length; i < length; i += idxStep) {       // pixels.data is 4 cells per pixel
        var e_index = i / idxStep;


        //e_edge = energy_edge_functional[index];
        var e_edge = we * (energy_edge_functional[e_index] - min_energy) / slope;

        //e_edge = ((energy_edge_functional[index] - min_energy)) / slope;  // normalize into one


        energy_edge_functional[e_index] = e_edge;

        if (isHeatmap) {
            var hue = 240 / 360 - e_edge * (240 / 360); // 240 / 360 - e_edge;
            if (hue > 240 / 360) hue = 240 / 360;
            if (hue < 0) hue = 0;
            if (we == 0)
                hue = 0;

            var colorArray = HSVtoRGB(hue, 1, 1, 1, true);     // 1=opacity, true == return as 3 element array
            data[i] = colorArray[0];      // r
            data[i + 1] = colorArray[1];  // g
            data[i + 2] = colorArray[2];  // b
        }
        else {
            var intensity = e_edge * 255;
            data[i] = intensity;
            data[i + 1] = intensity;
            data[i + 2] = intensity;
            data[i + 3] = 255;          // alpha
        }
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////


    destRGBLayer.putImageData(destPixel, 0, 0);
}
function doTermFunctional() {
    __doTermFunctional(bg_img_gaussian, layer_image_term_functional.getContext("2d"), image_width, image_height, "heatmap");
}
function __doTermFunctional(gaussian_img, destRGB, width, height, colorMode) {
    var isHeatmap = colorMode === 'heatmap';

    //////////////////////////////////////////////////
    var isRGBA = true;      // if true, each pixel in gaussian_img occupies 4 cells. Otherwise, 1 index cell per pixel
    var idxStep = isRGBA ? 4 : 1;       // this applies to original image... should be always 4, but, in case of 8 bit per pixel, this would be '1'.

    var pixels = gaussian_img;

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    if (energy_term_functional.length != pixels.data.length / idxStep)
        energy_term_functional = new Array(pixels.data.length / idxStep);


    var m1 = [-1, 1,
               0, 0];
    var m2 = [-1, 0,
               1, 0];
    var m3 = [1, -2, 1,
               0, 0, 0,
               0, 0, 0];
    var m4 = [1, 0, 0,
              -2, 0, 0,
               1, 0, 0];
    var m5 = [1, -1,
              -1, 1];

    //var cx_pixel = applyMatrixReturnNew(img, m1, 1, c.canvas.width, c.canvas.height);
    var cx_pixel = applyMatrixReturnNew(gaussian_img, m1, 1, width, height);
    var cy_pixel = applyMatrixReturnNew(gaussian_img, m2, 1, width, height);
    var cxx_pixel = applyMatrixReturnNew(gaussian_img, m3, 1, width, height);
    var cyy_pixel = applyMatrixReturnNew(gaussian_img, m4, 1, width, height);
    var cxy_pixel = applyMatrixReturnNew(gaussian_img, m5, 1, width, height);

    var cx = cx_pixel.data;
    var cy = cy_pixel.data;
    var cxx = cxx_pixel.data;
    var cyy = cyy_pixel.data;
    var cxy = cxy_pixel.data;

    var min_energy_term = 9999999, max_energy_term = -999999;
    var wt = get_wt();
    //if (!isShowTermFunctional()) wt = 0;
    //if (wt != 0)
    for (var i = 0, data = pixels.data, length = data.length; i < length; i += idxStep) {
        var index = i / idxStep;
        energy_term_functional[index] = (cyy[i] * cx[i] * cx[i] - 2.0 * cxy[i] * cx[i] * cy[i] + cxx[i] * cy[i] * cy[i]) / (Math.pow((1.0 + cx[i] * cx[i] + cy[i] * cy[i]), 1.5));
        if (min_energy_term > energy_term_functional[index])
            min_energy_term = energy_term_functional[index];
        if (max_energy_term < energy_term_functional[index])
            max_energy_term = energy_term_functional[index];
    }
    //alert(max_hue);

    var diff = Math.max(max_energy_term - min_energy_term, 0.0001);

    for (var i = 0, data = pixels.data, length = data.length; i < length; i += idxStep) {
        var e_index = i / idxStep;
        
        var e_term = wt * (energy_term_functional[e_index] - min_energy_term) / diff;
        energy_term_functional[e_index] = e_term;

        // about 90 is max
        //if (max_hue < hue) max_hue = hue;



        if (isHeatmap) {
            var hue = 240 / 360 - e_term * (240 / 360); // 240 / 360 - e_edge;
            if (hue > 240 / 360) hue = 240 / 360;
            if (hue < 0) hue = 0;
            if (we == 0)
                hue = 0;

            var colorArray = HSVtoRGB(hue, 1, 1, 1, true);     // 1=opacity, true == return as 3 element array
            data[i] = colorArray[0];      // r
            data[i + 1] = colorArray[1];  // g
            data[i + 2] = colorArray[2];  // b
        }
        else {
            var intensity = e_term * 255;
            data[i] = intensity;
            data[i + 1] = intensity;
            data[i + 2] = intensity;
            data[i + 3] = 255;          // alpha
        }

    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////


    destRGB.putImageData(pixels, 0, 0);
}
function doTotalEnergy(colorMode) {
    __doTotalEnergy(layer_total_energy.getContext("2d"), image_width, image_height, colorMode);
}
function __doTotalEnergy(destRGB, width, height, colorMode) {

    var destRGB = layer_total_energy.getContext("2d");
    var width = image_width;
    var height = image_height;

    var isHeatmap = colorMode === 'heatmap';

    //////////////////////////////////////////////////
    var isRGBA = true;      // if true, each pixel in gaussian_img occupies 4 cells. Otherwise, 1 index cell per pixel
    var idxStep = isRGBA ? 4 : 1;       // this applies to original image... should be always 4, but, in case of 8 bit per pixel, this would be '1'.

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    var totalLength = width * height;
    if (energy_total.length != totalLength)
        energy_total = new Array(totalLength);

    var max_energy = -9999999;
    var min_energy = 99999999;
    for (var index = 0; index < totalLength; index++) {
        
        energy_total[index] = 0;        // need to init 0 otherwise += becomes Nan
        energy_total[index] += energy_line_functional[index];
        energy_total[index] += energy_edge_functional[index];
        energy_total[index] += energy_term_functional[index];

        energy_total[index] /= 3;

        if (max_energy < energy_total[index]) max_energy = energy_total[index];
        if (min_energy > energy_total[index]) min_energy = energy_total[index];
    }

    //var grad = math_calc_gradient(energy_total, width, height, 4); // energy_total is 4 byte/pixel, but gradient is 1 byte/pixel!
    var grad = math_calc_gradient(energy_total, width, height, 1); // energy_total is 1 byte/pixel, also gradient is 1 byte/pixel. Previously, energy_total had 4 bytes/pixel 
    //var grad_x = grad.gradient_x;
    //var grad_y = grad.gradient_y;
    energy_gradient.gradient_x = grad.gradient_x;
    energy_gradient.gradient_y = grad.gradient_y;
    energy_gradient.width = width;
    energy_gradient.height = height;

    
    destRGB.fill(width, height);        // this creates an image
    var pixels = destRGB.getImageData(0, 0, width, height);

    // now normalize
    var diff = Math.max(max_energy - min_energy, 0.0001);

    //for (var i = 0, data = pixels.data; i < totalLength; i += idxStep) {
    for (var i = 0, data = pixels.data, length = data.length; i < length; i += idxStep) {
        var index = i / idxStep;
        //energy_total[index] = (energy_line_functional[index] + energy_edge_functional[index] + energy_term_functional[index]) / 3;
        //energy_total[index] /= max_energy;

        var total_energy = (energy_total[index] - min_energy) / diff;

        if (isHeatmap) {
            var hue = 240 / 360 - total_energy * 240 / 360;       // scale down
            if (hue < 0) hue = 0;
            if (hue > 240 / 360) hue = 240 / 360;

            var colorArray = HSVtoRGB(hue, 1, 1, 1, true);     // 1=opacity, true == return as 3 element array
            data[i] = colorArray[0];      // r
            data[i + 1] = colorArray[1];  // g
            data[i + 2] = colorArray[2];  // b
        }
        else {
            var intensity = total_energy * 255;
            data[i] = intensity;
            data[i + 1] = intensity;
            data[i + 2] = intensity;
            data[i + 3] = 255;          // alpha
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////


    destRGB.putImageData(pixels, 0, 0);
}

function doGaussian() {
    __doGaussian(layer_orig_image_grayscale.getContext("2d"),
                layer_image_gaussian.getContext("2d"),
                image_width, image_height, "not_used");
}
function __doGaussian(grayscale_img_layer, destRGB, width, height, colorMode) {       // only works on grayscale
    //var isHeatmap = colorMode === 'heatmap';

    //////////////////////////////////////////////////
    //var isRGBA = true;      // if true, each pixel in gaussian_img occupies 4 cells. Otherwise, 1 index cell per pixel
    //var idxStep = isRGBA ? 4 : 1;       // this applies to original image... should be always 4, but, in case of 8 bit per pixel, this would be '1'.

    
    
    ///////////////////////////////////////////////////////////////////////////////////////////////////
    //destRGB.fill(width, height);
    destRGB.putImageData(grayscale_img_layer.getImageData(0, 0, image_width, image_height), 0, 0);      // copy grayscale --> destination
    var destPixel = destRGB.getImageData(0, 0, image_width, image_height);
    
    gaussianBlur2(destPixel, width, height, getGaussianBlurAmount());

    ///////////////////////////////////////////////////////////////////////////////////////////////////

    destRGB.putImageData(destPixel, 0, 0);
}

function doGrayscale() {
    __doGrayscale(layer_orig_image.getContext("2d"),
                    layer_orig_image_grayscale.getContext("2d"),
                    image_width, image_height);
}
function __doGrayscale(orig_img, destRGB, width, height) {
    //var isHeatmap = colorMode === 'heatmap';    
    //////////////////////////////////////////////////
    var isRGBA = true;      // if true, each pixel in gaussian_img occupies 4 cells. Otherwise, 1 index cell per pixel
    var idxStep = isRGBA ? 4 : 1;       // this applies to original image... should be always 4, but, in case of 8 bit per pixel, this would be '1'.

    var pixels = orig_img.getImageData(0, 0, image_width, image_height);

    ///////////////////////////////////////////////////////////////////////////////////////////////////
    destRGB.putImageData(pixels, 0, 0);

    for (var i = 0, data = pixels.data, length = data.length; i < length; i += idxStep) {
        var brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
        data[i] = brightness;
        data[i + 1] = brightness;
        data[i + 2] = brightness;
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////////

    destRGB.putImageData(pixels, 0, 0);
}
function processSnakeFilters(filterType, img, img_ctx, params, c) {

    // create a second buffer to hold matrix results
    var buffer2 = document.createElement("canvas");
    // get the canvas context
    var temp_ctx = buffer2.getContext('2d');
    // set the dimensions
    var width = temp_ctx.width = buffer2.width = img.width;
    var height = temp_ctx.height = buffer2.height = img.height;

    // draw the image to the new buffer (this initializes temp_ctx, without this no image?)
    if (img instanceof Image)
        temp_ctx.drawImage(img, 0, 0, width, height);
    else
        temp_ctx.putImageData(img, 0, 0);

    //c2.clearRect(0, 0, img.width, img.height);
    var bufferedPixels = temp_ctx.getImageData(0, 0, width, height)

    // speed up access
    var bufferedData = bufferedPixels.data;

    if (img && c) {
        // create the temporary pixel array we'll be manipulating
        //var pixels = initializeBuffer(c, img);
        c.clearRect(0, 0, c.canvas.width, c.canvas.height);
        var pixels = img_ctx.getImageData(0, 0, width, height);

        if (pixels) {
            //
            // pre-processing for various filters
            //

            if (filterType == "filter-gaussian-blur") {
                pixels = gaussianBlur(img, pixels, getGaussianBlurAmount());
            }

            if (filterType == 'filter-grayscale-avg') {     // grayscale using AVERAGE method. For human, use Luminosity
                for (var i = 0, data = pixels.data, length = data.length; i < length >> 2; i++) {
                    var index = i << 2;

                    // get each colour value of current pixel
                    //var thisPixel = { r: data[index], g: data[index + 1], b: data[index + 2] };
                    data[index] = data[index + 1] = data[index + 2] = (data[index] + data[index + 1] + data[index + 2]) / 3;
                }
            }

            if (filterType == 'termination-functional') {


                var m1 = [-1, 1,
                           0, 0];
                var m2 = [-1, 0,
                           1, 0];
                var m3 = [ 1, -2, 1,
                           0, 0, 0,
                           0, 0, 0];
                var m4 = [ 1, 0, 0,
                          -2, 0, 0,
                           1, 0, 0];
                var m5 = [ 1, -1,
                          -1, 1];

                //var cx_pixel = applyMatrixReturnNew(img, m1, 1, c.canvas.width, c.canvas.height);
                var cx_pixel = applyMatrixReturnNew(img, m1, 1, width, height);
                var cy_pixel = applyMatrixReturnNew(img, m2, 1, width, height);
                var cxx_pixel = applyMatrixReturnNew(img, m3, 1, width, height);
                var cyy_pixel = applyMatrixReturnNew(img, m4, 1, width, height);
                var cxy_pixel = applyMatrixReturnNew(img, m5, 1, width, height);

                var cx = cx_pixel.data;
                var cy = cy_pixel.data;
                var cxx = cxx_pixel.data;
                var cyy = cyy_pixel.data;
                var cxy = cxy_pixel.data;

                var min_energy_term = 9999999, max_energy_term = -999999;
                var wt = get_wt();
                //if (!isShowTermFunctional()) wt = 0;
                //if (wt != 0)
                for (var i = 0, data = pixels.data, length = data.length; i < length; i += 4) {
                    var index = i / 4;
                    energy_term_functional[index] = (cyy[i] * cx[i] * cx[i] - 2.0 * cxy[i] * cx[i] * cy[i] + cxx[i] * cy[i] * cy[i]) / (Math.pow((1.0 + cx[i] * cx[i] + cy[i] * cy[i]), 1.5));
                    if (min_energy_term > energy_term_functional[index])
                        min_energy_term = energy_term_functional[index];
                    if (max_energy_term < energy_term_functional[index])
                        max_energy_term = energy_term_functional[index];
                }
                //alert(max_hue);

                for (var i = 0, data = pixels.data, length = data.length; i < length; i += 4) {
                    var e_index = i / 4;
                    energy_term_functional[e_index] *= wt;
                    var hue = (energy_term_functional[e_index] - min_energy_term) / (max_energy_term - min_energy_term) * (240 / 360);
                    // about 90 is max
                    //if (max_hue < hue) max_hue = hue;

                    hue = 240 / 360 - hue;
                    if (hue < 0) hue = 0;
                    if (hue > 240 / 360) hue = 240 / 360;

                    var colorArray = HSVtoRGB(hue, 1, 1, 1, true);     // 1=opacity, true == return as 3 element array

                    setRGB(data, index,
                        colorArray[0],
                        colorArray[1],
                        colorArray[2]);

                }
                /*
                for (var i = 0, data = pixels.data, length = data.length; i < length >> 2; i++) {
                    var indx = i << 2;
                    var x00 = indx;
                    var x01 = (i + 1) << 2;  // right
                    var x10 = (i + width) << 2; // below
                    var x11 = (i + width + 1) << 2;  // right & below

                    if (indx % width == 0 && indx > 0) {    // end of each row

                    }
                    else {

                    }

                }
                */

            }

            if (filterType == "filter-edges") {
                var matrix = [
                    0, 1, 0,
                    1, -4, 1,
                    0, 1, 0
                ];
                pixels = applyMatrix(img, pixels, matrix, params.edgesAmount);
            }
            if (filterType == "filter-matrix") {
                // 3x3 matrix can be any combination of digits, though to maintain brightness they should add up to 1
                // (-1 x 8 + 9 = 1)

                var matrix = [
                    // box blur default
                    0.111, 0.111, 0.111,
                    0.111, 0.111, 0.111,
                    0.111, 0.111, 0.111
                ];

                pixels = applyMatrix(img, pixels, matrix, params.matrixAmount, width, height);
            }
            if (filterType == "filter-sharpen") {
                var matrix = [
                    -1, -1, -1,
                    -1, 9, -1,
                    -1, -1, -1
                ];
                pixels = applyMatrix(img, pixels, matrix, params.sharpenAmount);
            }

            // we need to figure out RGB values for tint, let's do that ahead and not waste time in the loop
            if (filterType == "filter-tint") {
                var src = parseInt(createColor(params.tintColor), 16),
                    dest = { r: ((src & 0xFF0000) >> 16), g: ((src & 0x00FF00) >> 8), b: (src & 0x0000FF) };
            }



            if (filterType == 'edge-functional-using-matrix') {
                var matrix = [
                     0, 1, 0,
                     1, -4, 1,
                     0, 1, 0
                ];
                //pixels = applyMatrix(img, pixels, matrix, params.edgesAmount, c.canvas.width, c.canvas.height);
                //pixels = applyMatrix(img, pixels, matrix, 1.0, c.canvas.width, c.canvas.height);
                pixels = applyMatrix(img, pixels, matrix, 2.0, img.width, img.height);
                var edgeDivisor = $('#edgeDivisor').val();
                for (var i = 0, data = pixels.data, length = data.length; i < length >> 2; i++) {
                    var index = i << 2;

                    // get each colour value of current pixel
                    //var thisPixel = { r: data[index], g: data[index + 1], b: data[index + 2] };

                    bufferedPixels[index] = data[index];
                    bufferedPixels[index + 1] = data[index + 1];
                    bufferedPixels[index + 2] = data[index + 2];
                    bufferedPixels[index + 2] = 255;


                    //applySnakeFilters(filterType, params, img, bufferedPixels, index,
                    //  {
                    //    edgeDivisor: 1, //edgeDivisor,
                    //  delta_intensity: data[index].r
                    //pixel_center: thisPixel, pixel_left: pixel_left, pixel_right: pixel_right, pixel_above: pixel_above, pixel_below: pixel_below
                    //}
                    //, dest);

                    //applySnakeFilters(filterType, params, img, pixels, index, thisPixel, dest);
                }
            }

            if (filterType == 'edge-functional') {
                energy_edge_functional = new Array(pixels.data.length);

                //var edgeDivisor = $('#edgeDivisor').val();
                var index_left, index_right, index_above, index_below;

                var min_energy = 999999, max_energy = -999999;


                var grad = math_calc_gradient(pixels.data, width, height, 4);  // pixels.data is 4 bytes per pixel, and grad is 1 byte/pixel
                var gradient_x = grad.gradient_x;
                var gradient_y = grad.gradient_y;
                var we = get_we();
                //if (!isShowEdgeFunctional()) we = 0;        // if not checked, then it's ZERO.

                for (var i = 0, data = pixels.data, length = data.length; i < length >> 2; i++) {
                    var index = i << 2;
                    var gx = gradient_x[i], gy = gradient_y[i];
                    var e_edge = -Math.sqrt(gx * gx + gy * gy);
                    energy_edge_functional[index] = e_edge;

                    if (min_energy > e_edge) min_energy = e_edge;
                    if (max_energy < e_edge) max_energy = e_edge;

                }


                var slope = max_energy - min_energy;
                var e_edge = 0;
                for (var i = 0, data = pixels.data, length = data.length; i < length >> 2; i++) {
                    var index = i << 2;

                    e_edge = energy_edge_functional[index];


                    if (slope < 0.0001) {
                        slope = 0.0001;
                    }
                    //e_edge = ((energy_edge_functional[index] - min_energy)) / slope;  // normalize into one


                    energy_edge_functional[index] = we * e_edge;

                    var energy_for_color = (energy_edge_functional[index] - min_energy) / slope;
                    var hue = 240 / 360 - energy_for_color * (240 / 360); // 240 / 360 - e_edge;
                    if (hue > 240 / 360) hue = 240 / 360;
                    if (hue < 0) hue = 0;
                    if (we == 0)
                        hue = 0;



                    var colorArray = HSVtoRGB(hue, 0.8, 0.8, 1, true);     // 1=opacity, true == return as 3 element array


                    //data =
                    setRGB(bufferedData, index,
                        colorArray[0],
                        colorArray[1],
                        colorArray[2]);
                }
                //alert(min_energy);
                //alert(max_energy);
                //for (var i = 0, data = pixels.data, length = data.length; i < length >> 2; i++) {
                //    var index = i << 2;
                //}

                //console.log(max);
            }

            if (filterType == 'total-energy') {         // calculates entire sum of energy

                //var wl = isShowLineFunctional() ? get_wl() : 0;
                //var we = isShowEdgeFunctional() ? get_we() : 0;
                //var wt = isShowTermFunctional() ? get_wt() : 0;

                energy_total = new Array(pixels.data.length);
                var max_energy = -9999999;
                var min_energy = 99999999;
                for (var i = 0, data = pixels.data, length = data.length; i < length; i += 4) {
                    var index = i;
                    energy_total[index] = 0;        // need to init 0 otherwise += becomes Nan
                    if (wl != 0) energy_total[index] += energy_line_functional[index];
                    if (we != 0) energy_total[index] += energy_edge_functional[index];
                    if (wt != 0) energy_total[index] += energy_term_functional[index];

                    energy_total[index] /= 3;

                    if (max_energy < energy_total[index]) max_energy = energy_total[index];
                    if (min_energy > energy_total[index]) min_energy = energy_total[index];
                }

                //var grad = math_calc_gradient(energy_total, width, height, 4); // energy_total is 4 byte/pixel, but gradient is 1 byte/pixel!
                var grad = math_calc_gradient(energy_total, width, height, 1); // energy_total is 1 byte/pixel, also gradient is 1 byte/pixel. Previously, energy_total had 4 bytes/pixel 
                //var grad_x = grad.gradient_x;
                //var grad_y = grad.gradient_y;
                energy_gradient.gradient_x = grad.gradient_x;
                energy_gradient.gradient_y = grad.gradient_y;
                energy_gradient.width = width;
                energy_gradient.height = height;



                // now normalize
                var slope = max_energy - min_energy;
                if (slope < 0.0001) slope = 0.0001;
                for (var i = 0, data = pixels.data, length = data.length; i < length >> 2; i++) {
                    var index = i << 2;
                    //energy_total[index] = (energy_line_functional[index] + energy_edge_functional[index] + energy_term_functional[index]) / 3;
                    //energy_total[index] /= max_energy;

                    var energy_for_color = (energy_total[index] - min_energy) / slope;
                    var hue = 240 / 360 - energy_for_color * 240 / 360;       // scale down
                    if (hue < 0) hue = 0;
                    if (hue > 240 / 360) hue = 240 / 360;

                    var colorArray = HSVtoRGB(hue, 0.8, 0.8, 1, true);     // 1=opacity, true == return as 3 element array

                    setRGB(data, index,
                        colorArray[0],
                        colorArray[1],
                        colorArray[2]);

                }



            }


            // redraw the pixel data back to the working buffer
            if (filterType == 'edge-functional') {
                c.putImageData(bufferedPixels, 0, 0);
            }
            else {
                c.putImageData(pixels, 0, 0);
            }

            // stash a copy and let the original know how to reference it
            //stashOriginal(img, originalSuffix, ref, buffer);

        }
    }
}
var iteration = 0;

function doOneSnakeIteration() {            // this will actually move control points to lower energy
    //if (iteration == 2) return;
    //console.log('iteration=' + iteration);
    if (!$('#chkAnimate').is(':checked'))
        return;

    snake1.iterate(getSnakeKappa());
    layer_volcano.draw();       // this redraws volcano animation!
}

function doOneSnakeIterationOnTimer() {
    doOneSnakeIteration();
    setTimeout('doOneSnakeIterationOnTimer()', $('#interval').val() * 1000);
}


function drawVolcanoEnergy() {


    var volcano_ctx = layer_volcano_energy.getContext();  // this layer draws actual heatmap of energy
    //var volcano_ctx = layer_control_point.getContext();
    //var volcano_ctx = layer_volcano.getContext();

    var children = layer_volcano.getChildren();   // extract all control points from Circle object

    volcano_ctx.clear();
    energy_volcano = [];

    for (var i = 0; i < children.length; i++) {
        var x = children[i].getX() + 25;
        var y = children[i].getY() + 25;

        for (var r = 1; r <= 60; r++) {


            volcano_ctx.beginPath();
            volcano_ctx.setAttr('lineWidth', 1);
            //ctx.strokeStyle = 'red';
            var radius = r / 20.0;
            var e_volcano = 1.0 / (radius * radius);     // energy of volcano, relative to distance

            //var index = (y * volcano_ctx.canvas.width + x) * 4;
            //energy_volcano[index] = e_volcano;

            //console.log(e_volcano*5000);
            //var hue = Math.floor(e_volcano);     // 0 = red, 0.667 = blue (365 degrees)
            //if (hue > 0.6667) hue = 0.6667;
            var hue = e_volcano;
            //console.log(hue);
            //console.log(0.6677 - hue);
            var color = HSVtoRGB(240 / 360 - hue, 0.8, 0.8);
            //var color = HSVtoRGB(r * 0.667/100, 0.8, 0.8);

            //volcano_ctx.setAttr('fillStyle', color);
            volcano_ctx.setAttr('strokeStyle', color);
            volcano_ctx.setAttr('lineWidth', 1);
            //ctx.fillStyle = '#ff0000'; // hexToCanvasColor(color, 1);
            volcano_ctx.arc(x, y, r, 0.0, 2 * Math.PI);
            volcano_ctx.closePath();

            volcano_ctx.stroke();

        }
    }

    // DO NOT ENABLE THIS LINE!!!!! 10/9/2013
    //layer_volcano_energy.draw();        // don't do this here. This will erase all again, cuz, we're directly drawing above, no need for this.

}


/*
function isShowLineFunctional() {
    return $('#show_line_functional').is(':checked');
}
function isShowEdgeFunctional() {

    return $('#show_edge_functional').is(':checked');
}
function isShowTermFunctional() {
    return $('#show_term_functional').is(':checked');
}
*/
function refreshCanvas() {
    // draw original image
    layer_orig_image.draw();
    /*
                if ($('#show_grayscale').is(':checked')) {
                    layer_orig_image_grayscale.show();
                }
                else {
                    layer_orig_image_grayscale.hide();
                }
    
                if ($('#show_gaussian').is(':checked')) {
                    layer_image_gaussian.show();
                }
                else {
                    layer_image_gaussian.hide();
                }
    
                if (isShowLineFunctional()) {
                    layer_image_line_functional.show();
                }
                else {
                    layer_image_line_functional.hide();
                }
    
                if (isShowEdgeFunctional()) {
                    layer_image_edge_functional.show();
                }
                else {
                    layer_image_edge_functional.hide();
                }
    
                if (isShowTermFunctional()) {
                    layer_image_term_functional.show();
                }
                else {
                    layer_image_term_functional.hide();
                }
    
                if ($('#show_total_energy').is(':checked')) {
                    layer_total_energy.show();
                }
                else {
                    layer_total_energy.hide();
                }
    */
    //drawSnake(energy_spline, force_spline);
    layer_control_point.draw();
}
/*
function onTensionSliderChange() {
    $('#t').val($('#tension_slider').val());
    refreshCanvas();
}
*/
function onBezierSliderChange() {
    $('#bezier_slider_textbox').val($('#bezier_slider').val());
    refreshCanvas();
}
function onAlphaSliderChange() {
    var snake_alpha = $('#alpha_slider').val();
    $('#alpha').val(snake_alpha);

    refreshCanvas();
    initialize_snake();
}
function getSnakeAlpha() {
    return parseFloat($('#alpha').val());        // important to parseFloat(), otherwise 'string' type is returned!
}
function getSnakeBeta() {
    return parseFloat($('#beta').val());        // important to parseFloat(), otherwise 'string' type is returned!
}
function getSnakeGamma() {
    return parseFloat($('#gamma').val());        // important to parseFloat(), otherwise 'string' type is returned!
}

function onBetaSliderChange() {
    var snake_beta = $('#beta_slider').val();
    $('#beta').val(snake_beta);
    refreshCanvas();
    initialize_snake();
}
function onGammaSliderChange() {
    var snake_gamma = $('#gamma_slider').val();
    $('#gamma').val(snake_gamma);
    refreshCanvas();
    initialize_snake();
}
function onIntervalChange() {
    $('#interval').val($('#interval_slider').val());
}
function onAnimateChange() {
    if ($('#chkAnimate').is(':checked')) {  // turned on animation!
        // we need to convert spline curve into actual control points, so that it can move independently


    }

}
function onSnakeModeChange() {
    initialize_snake();
}
function loadImage(loadimgloc) {
    bg_imgloc = loadimgloc;
    //if (!loadimgloc) bg_imgloc = prompt('Enter image location:', '');
    if (bg_imgloc) {

        $('#loading').html('<img src="img/ajax-loader.gif"/>Loading...');       // not working
        //ghostcanvas = document.createElement('canvas');     // ghost canvas has original image, for pixel read at x,y
        //ghostcanvas.width = WIDTH;
        //ghostcanvas.height = HEIGHT;
        //var ghost_ctx = ghostcanvas.getContext('2d');

        // delete any current image
        layer_orig_image.removeChildren();

        // load ImageLoading image


        bg_img = new Image();

        bg_img.onload = function () {


            var bg = new Kinetic.Image({
                image: bg_img,
            });
            image_width = bg.getWidth();
            image_height = bg.getHeight();

            
            //bg.filters([Kinetic.Filters.Grayscale]);

            layer_orig_image.add(bg);       // add grayscale image
            layer_orig_image.draw();

            //layer_orig_image_grayscale.show();
            //layer_image_line_functional.show();
            //layer_image_edge_functional.hide();
            //layer_total_energy.show();

            //processSnakeFilters("filter-grayscale-avg", bg_img, layer_orig_image.getContext(), {}, layer_orig_image_grayscale.getContext());
            doGrayscale();
            
            // apply gaussian blur filter            
            doGaussian();

            //ghost_ctx.drawImage(bg_img, 0, 0, bg_img.width, bg_img.height);
            bg_img_gaussian = layer_image_gaussian.getContext("2d").getImageData(0, 0, image_width, image_height);
            //processSnakeFilters("line-functional", bg_img, layer_orig_image_grayscale.getContext(), {}, layer_image_line_functional.getContext());
            //processSnakeFilters("line-functional", bg_img_gaussian, layer_image_gaussian.getContext(), {}, layer_image_line_functional.getContext());
            
            doLineFunctional();
            

            
            //processSnakeFilters("edge-functional", bg_img_gaussian, layer_image_gaussian.getContext(), {}, layer_image_edge_functional.getContext());
            doEdgeFunctional();
            

            //processSnakeFilters("termination-functional", bg_img_gaussian, layer_image_gaussian.getContext(), {}, layer_image_term_functional.getContext());
            doTermFunctional();
            

            //processSnakeFilters("total-energy", bg_img_gaussian, layer_image_gaussian.getContext(), {}, layer_total_energy.getContext());
            doTotalEnergy();

            $('#loading').html('');

            initialize_snake();     // this initializes image energy, so must call!

        };
        bg_img.src = bg_imgloc;




    }
}
function isOpenSnake() {
    return $('#snakemode').val() == 'open_snake';
}
function clearAllControlPoints() {
    snake1.clear();
}
function initWithImage() {
    snake1.clear();     // remove all control points
    loadImage("img/" + $('#image').val());

}
function getGaussianBlurAmount() {
    return $('#blurAmount').val();
}
function onBlurSliderChange() {
    $('#blurAmount').val($('#blurAmount_slider').val());
    loadImage($('#image').val());  // re process the image
}
function onKappaSliderChange() {
    $('#kappa').val($('#kappa_slider').val());
}
function getSnakeKappa() {
    return parseFloat($('#kappa').val());        // important to parseFloat(), otherwise 'string' type is returned!
}
function get_wl() {
    return $('#wl').val();
}
function get_we() {
    return $('#we').val();
}
function get_wt() {
    return $('#wt').val();
}
function onShowLineFunctionalChange() {
    doLineFunctional();
    //processSnakeFilters("total-energy", bg_img_gaussian, layer_image_gaussian.getContext(), {}, layer_total_energy.getContext());
    doTotalEnergy();
    refreshCanvas();
}
function onShowEdgeFunctionalChange() {
    doEdgeFunctional();
    doTotalEnergy();

    refreshCanvas();
}
function onShowTermFunctionalChange() {
    doTermFunctional();
    doTotalEnergy();
    refreshCanvas();
}
function onWlSliderChange() {
    $('#wl').val($('#wl_slider').val());
    doLineFunctional();
    doTotalEnergy();

}
function onWeSliderChange() {
    $('#we').val($('#we_slider').val());
    doEdgeFunctional();
    doTotalEnergy();
}
function onWtSliderChange() {
    $('#wt').val($('#wt_slider').val());
    doTermFunctional();
    doTotalEnergy();
    
}
function getVolcanoFactor() {
    return $('#volcano_factor_slider').val();
}
function clearAllVolcano() {
    layer_volcano.removeChildren();
    layer_volcano.draw();
    layer_volcano_energy.draw();   // should be cleared since no volcano exists
}