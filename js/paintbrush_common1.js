// -----------------------------------------
//
// common.js
// Common functions used within PaintbrushJS
//
// -----------------------------------------
//
// These are adapted from code examples written by other people, 
// and are excluded from the PaintbrushJS license.
//
// Please see respective URLs for usage and licensing restrictions.
//


// addLoadEvent function, to attach events to page load
// by Simon Willison
// http://simonwillison.net/2004/May/26/addLoadEvent/

function addLoadEvent(func) {
    var oldonload = window.onload;
    if (typeof window.onload != 'function') {
        window.onload = func;
    } else {
        window.onload = function () {
            if (oldonload) {
                oldonload();
            }
            func();
        }
    }
}



//	getElementsByClassName
//	Developed by Robert Nyman, http://www.robertnyman.com
//	Code/licensing: http://code.google.com/p/getelementsbyclassname/
//	Documentation: http://robertnyman.com/2008/05/27/the-ultimate-getelementsbyclassname-anno-2008/
var getElementsByClassName = function (className, tag, elm) {
    if (document.getElementsByClassName) {
        getElementsByClassName = function (className, tag, elm) {
            elm = elm || document;
            var elements = elm.getElementsByClassName(className),
				nodeName = (tag) ? new RegExp("\\b" + tag + "\\b", "i") : null,
				returnElements = [],
				current;
            for (var i = 0, il = elements.length; i < il; i += 1) {
                current = elements[i];
                if (!nodeName || nodeName.test(current.nodeName)) {
                    returnElements.push(current);
                }
            }
            return returnElements;
        };
    }
    else if (document.evaluate) {
        getElementsByClassName = function (className, tag, elm) {
            tag = tag || "*";
            elm = elm || document;
            var classes = className.split(" "),
				classesToCheck = "",
				xhtmlNamespace = "http://www.w3.org/1999/xhtml",
				namespaceResolver = (document.documentElement.namespaceURI === xhtmlNamespace) ? xhtmlNamespace : null,
				returnElements = [],
				elements,
				node;
            for (var j = 0, jl = classes.length; j < jl; j += 1) {
                classesToCheck += "[contains(concat(' ', @class, ' '), ' " + classes[j] + " ')]";
            }
            try {
                elements = document.evaluate(".//" + tag + classesToCheck, elm, namespaceResolver, 0, null);
            }
            catch (e) {
                elements = document.evaluate(".//" + tag + classesToCheck, elm, null, 0, null);
            }
            while ((node = elements.iterateNext())) {
                returnElements.push(node);
            }
            return returnElements;
        };
    }
    else {
        getElementsByClassName = function (className, tag, elm) {
            tag = tag || "*";
            elm = elm || document;
            var classes = className.split(" "),
				classesToCheck = [],
				elements = (tag === "*" && elm.all) ? elm.all : elm.getElementsByTagName(tag),
				current,
				returnElements = [],
				match;
            for (var k = 0, kl = classes.length; k < kl; k += 1) {
                classesToCheck.push(new RegExp("(^|\\s)" + classes[k] + "(\\s|$)"));
            }
            for (var l = 0, ll = elements.length; l < ll; l += 1) {
                current = elements[l];
                match = false;
                for (var m = 0, ml = classesToCheck.length; m < ml; m += 1) {
                    match = classesToCheck[m].test(current.className);
                    if (!match) {
                        break;
                    }
                }
                if (match) {
                    returnElements.push(current);
                }
            }
            return returnElements;
        };
    }
    return getElementsByClassName(className, tag, elm);
};



// simple check to see whether canvas is supported in this browser
// copied and pasted from http://diveintohtml5.org/detect.html#canvas
function supports_canvas() {
    return !!document.createElement('canvas').getContext;
}

function gaussianBlur2(pixels, width, height, amount) {
    var width4 = width << 2;
    if (pixels) {
        var data = pixels.data;

        // compute coefficients as a function of amount
        var q;
        if (amount < 0.0) {
            amount = 0.0;
        }
        if (amount >= 2.5) {
            q = 0.98711 * amount - 0.96330;
        } else if (amount >= 0.5) {
            q = 3.97156 - 4.14554 * Math.sqrt(1.0 - 0.26891 * amount);
        } else {
            q = 2 * amount * (3.97156 - 4.14554 * Math.sqrt(1.0 - 0.26891 * 0.5));
        }

        //compute b0, b1, b2, and b3
        var qq = q * q;
        var qqq = qq * q;
        var b0 = 1.57825 + (2.44413 * q) + (1.4281 * qq) + (0.422205 * qqq);
        var b1 = ((2.44413 * q) + (2.85619 * qq) + (1.26661 * qqq)) / b0;
        var b2 = (-((1.4281 * qq) + (1.26661 * qqq))) / b0;
        var b3 = (0.422205 * qqq) / b0;
        var bigB = 1.0 - (b1 + b2 + b3);

        // horizontal
        for (var c = 0; c < 3; c++) {
            for (var y = 0; y < height; y++) {
                // forward 
                var index = y * width4 + c;
                var indexLast = y * width4 + ((width - 1) << 2) + c;
                var pixel = data[index];
                var ppixel = pixel;
                var pppixel = ppixel;
                var ppppixel = pppixel;
                for (; index <= indexLast; index += 4) {
                    pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
                    data[index] = pixel;
                    ppppixel = pppixel;
                    pppixel = ppixel;
                    ppixel = pixel;
                }
                // backward
                index = y * width4 + ((width - 1) << 2) + c;
                indexLast = y * width4 + c;
                pixel = data[index];
                ppixel = pixel;
                pppixel = ppixel;
                ppppixel = pppixel;
                for (; index >= indexLast; index -= 4) {
                    pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
                    data[index] = pixel;
                    ppppixel = pppixel;
                    pppixel = ppixel;
                    ppixel = pixel;
                }
            }
        }

        // vertical
        for (var c = 0; c < 3; c++) {
            for (var x = 0; x < width; x++) {
                // forward 
                var index = (x << 2) + c;
                var indexLast = (height - 1) * width4 + (x << 2) + c;
                var pixel = data[index];
                var ppixel = pixel;
                var pppixel = ppixel;
                var ppppixel = pppixel;
                for (; index <= indexLast; index += width4) {
                    pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
                    data[index] = pixel;
                    ppppixel = pppixel;
                    pppixel = ppixel;
                    ppixel = pixel;
                }
                // backward
                index = (height - 1) * width4 + (x << 2) + c;
                indexLast = (x << 2) + c;
                pixel = data[index];
                ppixel = pixel;
                pppixel = ppixel;
                ppppixel = pppixel;
                for (; index >= indexLast; index -= width4) {
                    pixel = bigB * data[index] + b1 * ppixel + b2 * pppixel + b3 * ppppixel;
                    data[index] = pixel;
                    ppppixel = pppixel;
                    pppixel = ppixel;
                    ppixel = pixel;
                }
            }
        }

        return (pixels);
    }

}


// calculate gaussian blur
// adapted from http://pvnick.blogspot.com/2010/01/im-currently-porting-image-segmentation.html
function gaussianBlur(img, pixels, amount) {

    var width = img.width;
    var height = img.height;
    return gaussianBlur2(pixels, width, height, amount);
}


// remove a specific class from an element
// from http://www.openjs.com/scripts/dom/class_manipulation.php
function removeClass(obj, cls) {
    if (hasClass(obj, cls)) {
        var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        obj.className = obj.className.replace(reg, ' ');
    }
}
function addClass(obj, cls) {
    if (!this.hasClass(obj, cls)) {
        obj.className += " " + cls;
    }
}
function hasClass(obj, cls) {
    return obj.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
}




// convert x/y coordinates to pixel index reference
function convertCoordinates(x, y, w) {
    return x + (y * w);
}


// apply a convolution matrix
function applyMatrix(img, pixels, matrix, amount, c_width, c_height) {

    // create a second buffer to hold matrix results
    var buffer2 = document.createElement("canvas");
    // get the canvas context 
    var c2 = buffer2.getContext('2d');

    // set the dimensions
    c2.width = buffer2.width = img.width;
    c2.height = buffer2.height = img.height;

    // draw the image to the new buffer
    c2.drawImage(img, 0, 0, img.width, img.height);
    var bufferedPixels = c2.getImageData(0, 0, c_width, c_height)

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

//  applyMatrixImageToDouble(PImage source, double[] target, double[] kernel, bool limitTo255) {
function applyMatrixImageToDouble(source, width, height, target, kernel, limitTo255) {
    //var width = source.width;
    //var size = width * source.height;
    var size = width * height;
    
    var row = 0;
    var col = 0;

    for(var i = 0; i < size; i++ ) {
        var v = convolution_grayscale_pimage_1dkernel(row, col, source, width, height, kernel);
        if( limitTo255 )
            v = ( (v|0) ) & 0xff;
        target[i] = v;      // target is just an array
        if( ++col >= width ) {
            row++;
            col = 0;
        }
    }
    
}
function constrain(v, min, max) {
    if (v < min) return min;
    if (v > max) return max;
    return v;
}
// convolution_grayscale_pimage_1dkernel(int row, int col, PImage input, double[] kernel)
function convolution_grayscale_pimage_1dkernel(row, col, input, width, height, kernel) {
    //var width = input.width;
    //var height = input.height;
    var rtotal = 0.0;
    var matrixsize = kernel.length;
    var kernelwidth = Math.sqrt(matrixsize) | 0;       // 9 ==> 3x3. kernelwidth = 3
    
    var offset = (kernelwidth / 2) | 0;

    var pixel = input.data;     // KineticJS requires .data here. Otherwise, seems to send a copy

    for (var i = 0; i < kernelwidth; i++) {
        for (var j= 0; j < kernelwidth; j++) {
        
            var row2 = constrain(row+i-offset, 0, height-1);
            var col2 = constrain(col+j-offset, 0, width-1);
            var loc = (col2 + width*row2);
        
        // Make sure we haven't walked off our image, we could do better here
            loc = constrain(loc,0,width*height-1) * 4;      // * 4 is necessary since KineticsJS uses UInt8ClampedArray
            
        // Calculate the convolution
            //rtotal += (input.pixels[loc] & 0xFF) * kernel[i*kernelwidth + j];  // 0xFF is needed to see only 1 channel (grayscale)
            rtotal += (pixel[loc] & 0xFF) * kernel[i * kernelwidth + j];  // 0xFF is needed to see only 1 channel (grayscale)
    
        }
    }
        //if( limitTo255 )        // for image, should be TRUE.  But, for mathematical calculation, FALSE
        //rtotal = constrain(rtotal,0,255);     // Make sure RGB is within range
    
    return rtotal;          // Return the resulting color
}

// apply a convolution matrix
function applyMatrixArray(img, pixels, matrix, amount, width, height) {

    // create a second buffer to hold matrix results
    var buffer2 = document.createElement("canvas");
    // get the canvas context 
    var c2 = buffer2.getContext('2d');

    // set the dimensions
    c2.width = buffer2.width = img.width;
    c2.height = buffer2.height = img.height;

    // draw the image to the new buffer
    c2.drawImage(img, 0, 0, img.width, img.height);
    var bufferedPixels = c2.getImageData(0, 0, width, height)

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