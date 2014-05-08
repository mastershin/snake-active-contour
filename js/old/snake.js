// graphics engine for snake
function SnakeKineticEngine() {
    var _isLastControlPointDragged;
    this.isLastControlPointDragged = function () { // this is used to indicate, whether the last time the 
        if (_isLastControlPointDragged) {       // once this function is called, next time, it wasn't drag. (ok to add new control point)
            _isLastControlPointDragged = false;
            return true;
        }
        return false;
    }

    var _layer_cp;      // layer containing snake's control point

    this.clear = function () {
        _layer_cp.removeChildren();
        _layer_cp.draw();
    }
    this.init = function (layer_control_pts) {
        _layer_cp = layer_control_pts;
    }
    this.addControlPoint = function (new_x, new_y) {
        var cp = new Kinetic.Circle({
            //id: 'cp' + layer_control_point.getChildren().length,
            x: new_x,
            y: new_y,
            radius: 2,
            stroke: 'black',
            fill: 'yellow',
            strokeWidth: 1,
            draggable: true,
        });
        _layer_cp.add(cp);

        // add hover styling
        cp.on('mouseover', function () {
            document.body.style.cursor = 'pointer';
            this.setStrokeWidth(4);
        });
        cp.on('mouseout', function () {
            document.body.style.cursor = 'default';
            this.setStrokeWidth(2);
            //drawSnake();                
        });
        cp.on('dragmove', function () {
            //drawSnake(energy_spline, force_spline, image_width, image_height);
            //layer_control_point.draw();
        });
        cp.on('dragend', function () {
            this.setStrokeWidth(2);
            _isLastControlPointDragged = true;     // this prevents 'click' event which adds new point again after dragging

            _layer_cp.draw();
        });
    }

    function _calculateInternalEnergy(alpha, beta, prev, p, next) {
        // uses prev & next
        var dv_ds = (Math.sqrt(Math.pow(prev.y - p.y, 2) + Math.pow(prev.x - p.x, 2)) + Math.sqrt(Math.pow(next.y - p.y, 2) + Math.pow(next.x - p.x, 2))) / 2;

        // only look for prev
        //var dv_ds = Math.pow(prev.y - p.y, 2) + Math.pow(prev.x - p.x, 2);

        // this attemps to keep the points at equal distance (spread them equally along snake)
        // reference: http://www.cse.unr.edu/~bebis/CS791E/Notes/DeformableContours.pdf
        //var dv_ds = Math.pow(3 - (prev.y - p.y),2) + Math.pow(3 - (prev.x - p.x), 2); // ) + Math.sqrt(Math.pow(next.y - p.y, 2) + Math.pow(next.x - p.x, 2));

        var e_continuity = alpha * dv_ds;     // distance between previous point

        var line1 = { x1: prev.x, y1: prev.y, x2: p.x, y2: p.y };
        var line2 = { x1: p.x, y1: p.y, x2: next.x, y2: next.y };
        //var e_curvature = beta * Math.abs(getCurvatureAngle(line1, line2));     // Math.atan2 returns -pi to pi
        var e_curvature = Math.pow(prev.x - 2 * p.x + next.x, 2) + Math.pow(prev.y - 2 * p.y + next.y, 2);
        e_curvature = beta * e_curvature;

        var e_internal = (e_continuity + e_curvature) / 2;

        return e_internal;
    }

    // draw's snake.  In fact, this just changes the color of control point, according to internal energy
    this.drawSnake = function (new_x, new_y, alpha, beta, isOpenSnake) {
        var ctx = _layer_cp.getContext(); // .getCanvas().getContext();        

        var children = layer_control_point.getChildren();   // extract all control points from Circle object

        var GetCorrectIndex = function (arr, indx) {  // supports negative index. -1 means last item, -2 means 2nd item from the last
            if (indx >= 0) {
                indx = indx % arr.length;
                return indx;
            }
            if (arr.length == 1)
                return 0;

            return arr.length + indx;
        }
        var length = children.length;
        if (length != new_x.length || length != new_y.length) {
            alert('Length of new_x and new_y must match current control point length! (inconsistent)');
            return;
        }

        for (var cp = 0; cp < length; cp++) {
            children[cp].setX(new_x[cp]);       // move each point to new location
            children[cp].setY(new_y[cp]);

            var previndex = GetCorrectIndex(children, cp - 1);

            if (isOpenSnake && cp == 0) {  // for open snake, just duplicate initial point as previous
                previndex = 0;
            }
            var prev = { x: children[previndex].getX(), y: children[previndex].getY() };

            var nextindex = GetCorrectIndex(children, cp + 1);
            if (isOpenSnake && cp == children.length - 1) {  // for open snake, just duplicate initial point as previous
                nextindex = children.length - 1;
            }
            var next = { x: children[nextindex].getX(), y: children[nextindex].getY() };
            var p = { x: children[cp].getX(), y: children[cp].getY() };

            var e_internal = _calculateInternalEnergy(alpha, beta, prev, p, next);
            var factor = 0.3;
            var hue = e_internal * factor * 240 / 360;       // scale down to 0 and 1
            if (hue < 0) hue = 0;
            if (hue > 240 / 360) hue = 240 / 360;
            hue = 240 / 360 - hue;      // reverse, so that 240/360 is RED (hot), which is 0 is HSV scale
            var color = _HSVtoRGB(hue, 0.8, 0.8);

            children[cp].setFill(color);
        }
        _layer_cp.draw();
    }
    this.redraw = function() {
        _layer_cp.draw();
        
    }


    function _HSVtoRGB(h, s, v, opacity, returnAsArray) {
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
}

function Snake(graphics_engine) {
    var _g = graphics_engine;



    var _x = [];
    var _y = [];

    // 2D interpolation
    function getInterpolated(x1, y1, x2, y2, segments) {
        var points = [];
        var x = x1, y = y1;
        points.push(x);
        points.push(y);
        for (var i = 0; i < segments; i++) {
            x += (x2 - x1) / segments;
            y += (y2 - y1) / segments;
            points.push(x);
            points.push(y);
        }
        return points;
    }

    this.addControlPoint = function (x, y, pointsPerLine) {
        var length = _x.length;
        if (length == 0) {
            _g.addControlPoint(x, y);
            _x.push(x);
            _y.push(y);
        }
        else {  // need to interpolate, and call function for every points (except the very first one

            var x1 = _x[length - 1];  // get the very last point.  We're interpolating from (x1,y1) ==> (x2,y2)
            var y1 = _y[length - 1];
            var x2 = x;
            var y2 = y;
            var interpolated = getInterpolated(x1, y1, x2, y2, pointsPerLine);
            for (var i = 2; i < interpolated.length; i += 2) {  // start with 1, meaning don't create another existing last point! [x1,y1, x2,y2, x3,y3, x4,y4...]
                var new_x = interpolated[i], new_y = interpolated[i + 1]
                _g.addControlPoint(new_x, new_y);
                _x.push(new_x);
                _y.push(new_y);
            }
        }        
    }
    this.isLastControlPointDragged = function () {
        return _g.isLastControlPointDragged();
    }
    var _math = new numeric();
    var _matrix_A;        // penta diagonal matrix (A)    
    var _matrix_Ainv;     // this is inverse of (A + gamma * I)
    var _alpha, _beta, _gamma;
    var _energy_gradient;       // var energy_gradient = { gradient_x: [], gradient_y: [], width: 0, height: 0 };        // gradient of energy (image forces)
    var _width, _height;        // width & height of area that snake moves.

    // calculates initial matrix for snake (A and A inverse matrix)
    this.init = function (alpha, beta, gamma, bOpenSnake, energy_gradient, default_width, default_height) {   // if there's no image (no energy gradient), then use entire canva's width & height

        var m = _x.length;
        _alpha = alpha;     // alpha, beta, gamma are used again in iterate()
        _beta = beta;
        _gamma = gamma;
        _energy_gradient = energy_gradient;
        _width = default_width;
        _height = default_height;

        if (m <= 1)         // must have at least 1 control points for matrix setup
            return;

        // implement A = alpha * A_alpha + beta * A_beta
        var A_alpha = numeric.identity(m);
        var A_beta = numeric.identity(m);
        var set = function (matrix, row, col, value) {
            if (col < 0) {
                if (bOpenSnake) return;     // do not update if open snake!
                col = m + col;
            }
            if (col >= m) {
                if (bOpenSnake) return;     // do not update if open snake!
                col = col - m;
            }
            //matrix.subset(math.index(row, col), value);
            matrix[row][col] = value;
        };
        for (var i = 0; i < m; i++) {

            //A_alpha.subset(math.index(i, i), 2);      // this is mathjs.org format

            set(A_alpha, i, i - 1, -1);
            set(A_alpha, i, i + 1, -1);
            A_alpha[i][i] = 2;      // always 2 diagonally


            set(A_beta, i, i - 1, -4);
            set(A_beta, i, i - 2, 1);
            set(A_beta, i, i + 1, -4);
            set(A_beta, i, i + 2, 1);
            A_beta[i][i] = 6;       // set(A_beta, i, i, 6);   Always 6 diagonally

        }

        if (bOpenSnake) {
            A_alpha[0][m - 1] = 0;  // right upper corner
            A_alpha[m - 1][0] = 0;  // left bottom corner

            A_alpha[m - 1][m - 1] = 1; // right bottom corner

            A_alpha[0][0] = 1; // left upper corner
            A_alpha[0][1] = -1;

                        
            A_beta[0][m - 1] = 0; // right upper corner
            A_beta[0][m - 2] = 0;
            A_beta[1][m - 1] = 0; // 2nd row, right upper

            A_beta[m - 1][0] = 0; // left bottom corner
            A_beta[m - 1][1] = 0;
            A_beta[m - 2][0] = 0;

            A_beta[0][0] = 1;   // left upper corner
            A_beta[0][1] = -2;
            A_beta[0][2] = 1;
            A_beta[m - 1][m - 1] = 1;   // right bottom corner
            A_beta[m - 1][m - 2] = -2;
            A_beta[m - 1][m - 3] = 1;
            
        }

        //print_matrix(A_alpha);
        //print_matrix(A_beta);

        var alpha_times_A_alpha = numeric.mul(A_alpha, alpha);
        var beta_times_A_beta;
        if (bOpenSnake)
            beta_times_A_beta = numeric.mul(A_beta, 0);
        else
            beta_times_A_beta = numeric.mul(A_beta, beta);
        _matrix_A = numeric.add(alpha_times_A_alpha, beta_times_A_beta);
        //print_matrix(alpha_times_A_alpha);
        //print_matrix(_matrix_A);

        // now calculate inverse of (A + gamma x I)
        var gamma_times_I = numeric.mul(numeric.identity(m), gamma);
        var A_plus_gamma_I = numeric.add(_matrix_A, gamma_times_I);
        //print_matrix(_matrix_A);
        //print_matrix(gamma_times_I);
        //print_matrix(A_plus_gamma_I);

        _matrix_Ainv = numeric.inv(A_plus_gamma_I);
        //print_matrix(_matrix_Ainv);


    }
    this.clear = function () {
        _x = [];
        _y = [];
        _g.clear();
    }
    this.redraw = function () {
        _g.redraw();
    }
    this.moveControlPoint = function(index, new_x, new_y) {        // used for spring effect
        _x[index] = new_x;
        _y[index] = new_y;
    }
    // kappa is the multiplier for energy forces. kappa x energy is subtracted. Lower kappa means less energy influence of snake
    this.iterate = function (kappa) {
        var energyGradientExists = _energy_gradient && _energy_gradient.gradient_x.length > 0;
        var width = energyGradientExists ? _energy_gradient.width : _width;     // if no energy, use default width & height (canvas width & height). If there's an image, use only image's width!!
        var height = energyGradientExists ? _energy_gradient.height : _height;      // important for proper function of snake. Arrays would be buggy, if image is present, and use wrong width!


        var length = _x.length;
        var xs = [[]], ys = [[]];
        //var children = layer_control_point.getChildren();   // extract all control points 
        if (length <= 2) return;

        for (var i = 0; i < length; i++) {     // numericjs accepts array within array format. [ [x1 y1], [x2 y2], ... etc.]
            xs[0][i] = parseFloat(_x[i]);   // [0] ==> 1st row
            ys[0][i] = parseFloat(_y[i]);
        }


        //console.log(xs[0][0] + ' ' + ys[0][0]);
        //xs_vertical = [1, 3, 5, 6, 7, 9, 3];
        //ys_vertical = [2, 4, 6, 10, 11, 13, 14];
        xs_transposed = numeric.transpose(xs);
        ys_transposed = numeric.transpose(ys);

        var ssx = numeric.mul(xs_transposed, _gamma);
        var ssy = numeric.mul(ys_transposed, _gamma);

        //var fx = [1, 3, 89, 99];
        //console.log(linear_interpolation4(fx, 2, 2, .1, .2, 1));

        for (var i = 0; i < length; i++) {
            //var index = ys[0][i] * image_width + xs[0][i];
            //index = index << 2;         // energy_grad_x is based on 4 bytes per pixel, so need to multiply by *4

            if (xs[0][i] < 0)
                xs[0][i] = 0;
            else if (new_x >= width)
                xs[0][i] = width - 1;
            if (ys[0][i] < 0)
                ys[0][i] = 0;
            else if (ys[0][i] >= height)
                ys[0][i] = height - 1;

            //var f_grad_x = energy_grad_x ? parseFloat(energy_grad_x[index]) : 0.0;
            var f_grad_x = energyGradientExists ? math_linear_interpolation(_energy_gradient.gradient_x, width, height, xs[0][i], ys[0][i], 1) : 0; // energy_grad_x is 1 byte per pixel array, not 4 byte per pixel
            //f_grad_x = energy_total[index + 4] - energy_total[index];
            f_grad_x = parseFloat(f_grad_x);
            if (isNaN(f_grad_x))
                f_grad_x = 0;

            ssx[i] = parseFloat(ssx[i]) + parseFloat(-kappa * f_grad_x);        // ssx[i] is string type. So, need to do parseFloat().  subtract kappa x energy

            var f_grad_y = energyGradientExists ? math_linear_interpolation(_energy_gradient.gradient_y, width, height, xs[0][i], ys[0][i], 1) : 0; // energy_grad_y is 1 byte per pixel array, not 4 byte per pixel
            f_grad_y = parseFloat(f_grad_y);
            if (isNaN(f_grad_y))
                f_grad_y = 0;
            //var f_grad_y = energy_grad_y ? parseFloat(energy_grad_y[index]) : 0.0;
            //f_grad_y = energy_total[index + imgWidth*4] - energy_total[index];
            ssy[i] = parseFloat(ssy[i]) + parseFloat(-kappa * f_grad_y);

            var x = xs[0][i];
            var y = ys[0][i];
            var volcano_factor = getVolcanoFactor();
            var volcano = layer_volcano.getChildren();   // extract all control points from Circle object                
            for (var volcano_idx = 0; volcano_idx < volcano.length; volcano_idx++) {
                var volcano_x = volcano[volcano_idx].getX() + 25;
                var volcano_y = volcano[volcano_idx].getY() + 25;


                var distance = Math.sqrt((Math.pow(x - volcano_x, 2) + Math.pow(y - volcano_y, 2)));

                if (distance < 60) {
                    if (distance < 0.0001) distance = 0.001;
                    var normalized_x = (volcano_x - x) / distance;
                    var normalized_y = (volcano_y - y) / distance;
                    ssx[i] = ssx[i] + volcano_factor * normalized_x;
                    ssy[i] = ssy[i] + volcano_factor * normalized_y;
                }
            }

            //for(var r = 1; r <= 60; r++ ) {

        }


        //print_matrix(ssx);
        //print_matrix(ssy);
        //print_matrix(snake_Ainv);
        var xs_new = numeric.dot(_matrix_Ainv, ssx);      // this is new control points
        var ys_new = numeric.dot(_matrix_Ainv, ssy);

        //print_matrix(xs_new);
        //print_matrix(ys_new);

        for (var i = 0; i < length; i++) {
            var new_x = parseFloat(xs_new[i]), new_y = parseFloat(ys_new[i]);

            if (new_x < 0)
                new_x = 0;
            else if (new_x >= width)
                new_x = width - 1;
            _x[i] = new_x;

            if (new_y < 0)
                new_y = 0;
            else if (new_y >= height)
                new_y = height - 1;
            _y[i] = new_y;
        }
        _g.drawSnake(_x, _y, _alpha, _beta, isOpenSnake());     // alpha, beta are passed, only to colorize snake's control point according to internal energy

    }
    function print_matrix(matrix) {
        //var precision = 2;
        //var s = ' ' + math.format(value, precision);
        //console.log(s.replace(/], /g, ']' + '\r\n'));
        var s = '';

        var dimension = numeric.dim(matrix);
        var nrow = dimension[0];
        var ncol = dimension[1];

        for (var row = 0; row < nrow; row++) {
            for (var col = 0; col < ncol; col++) {
                s += matrix[row][col] + ' ';
            }
            s += '\r\n';
        }
        //console.log(numeric.identity(5));
        console.log(s);
    }
    

}