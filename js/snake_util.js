function hexToCanvasColor(hexColor, opacity) {
    // Convert #AA77CC to rbga() format for Firefox
    opacity = opacity || "1.0";
    hexColor = hexColor.replace("#", "");
    var r = parseInt(hexColor.substring(0, 2), 16);
    var g = parseInt(hexColor.substring(2, 4), 16);
    var b = parseInt(hexColor.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
}
function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255) throw "Invalid color component";
    return ((r << 16) | (g << 8) | b).toString(16);
}
function getCurvatureAngle(line1, line2) {
    var angle1 = Math.atan2(line1.y1 - line1.y2,
                               line1.x1 - line1.x2);
    var angle2 = Math.atan2(line2.y1 - line2.y2,
                           line2.x1 - line2.x2);
    return angle1 - angle2;
}

function getBezierPoint(t, p0, p1, p2, p3) {
    var cX = 3 * (p1.x - p0.x),
        bX = 3 * (p2.x - p1.x) - cX,
        aX = p3.x - p0.x - cX - bX;

    var cY = 3 * (p1.y - p0.y),
        bY = 3 * (p2.y - p1.y) - cY,
        aY = p3.y - p0.y - cY - bY;

    var x = (aX * Math.pow(t, 3)) + (bX * Math.pow(t, 2)) + (cX * t) + p0.x;
    var y = (aY * Math.pow(t, 3)) + (bY * Math.pow(t, 2)) + (cY * t) + p0.y;

    return { x: x, y: y };  // return 1 point (x,y)
};



function myBezierCurveTo(ctx, ptr_per_segment, x0, y0, x1, y1, x2, y2, x3, y3) {

    var
        p0 = { x: x0, y: y0 }, //use whatever points you want obviously
        p1 = { x: x1, y: y1 },
        p2 = { x: x2, y: y2 },
        p3 = { x: x3, y: y3 };
    var prev = { x: x0, y: y0 };
    var prevprev = { x: x0, y: y0 };
    //var alpha = 1, beta = 1;

    var alpha = $('#alpha').val();
    var beta = $('#beta').val();

    //ctx.moveTo(p0.x, p0.y);
    for (var i = 0; i < 1; i += ptr_per_segment) {
        var p = getBezierPoint(i, p0, p1, p2, p3);
        //ctx.lineTo(p.x, p.y);

        var dv_ds = Math.sqrt(Math.pow(prev.y - p.y, 2) + Math.pow(prev.x - p.x, 2));
        var e_continuity = alpha * dv_ds;     // distance between previous point

        var line1 = { x1: prevprev.x, y1: prevprev.y, x2: prev.x, y2: prev.y };
        var line2 = { x1: prev.x, y1: prev.y, x2: p.x, y2: p.y };
        var e_curvature = beta * Math.abs(getCurvatureAngle(line1, line2));     // Math.atan2 returns -pi to pi

        var e_internal = (e_continuity + e_curvature) / 2;

        //console.log('e_continuity=' + e_continuity);
        //console.log(e_internal);

        var hue = Math.floor(240 * e_internal / 3.1415926);
        if (hue > 240) {
            hue = 240;
        }
        hue = 240 - hue;

        var color = HSVtoRGB(hue / 360, 0.8, 0.8);

        drawPoint(ctx, p.x, p.y, 1.5, color);       // draw directly to Canvas                

        prevprev = prev;
        prev = p;
        //console.log(prevprev.x + ":" & prevprev.y);                
    }
}



function drawPoint(ctx, x, y, r, color) {
    //ctx.save();
    ctx.beginPath();
    ctx.setAttr('lineWidth', 1);
    //ctx.strokeStyle = 'red';

    ctx.setAttr('fillStyle', color);
    //ctx.fillStyle = '#ff0000'; // hexToCanvasColor(color, 1);        
    ctx.arc(x, y, r, 0.0, 2 * Math.PI);
    ctx.closePath();

    ctx.fill();

    //ctx.strokeStyle = 'red'; // hexToCanvasColor(color, 1);
    //ctx.stroke();


}
function drawControlPoint(layer, x, y, r, color) {      // kineticjs layer

    var controlPoint = new Kinetic.Circle({
        x: x,
        y: y,
        radius: r,
        stroke: 'black',
        fill: color,
        strokeWidth: 2,

    });
    //layer_control_point.add(controlPoint);

}

function getControlPoints(x0, y0, x1, y1, x2, y2, t) {
    //  x0,y0,x1,y1 are the coordinates of the end (knot) pts of this segment
    //  x2,y2 is the next knot -- not connected here but needed to calculate p2
    //  p1 is the control point calculated here, from x1 back toward x0.
    //  p2 is the next control point, calculated here and returned to become the 
    //  next segment's p1.
    //  'tension' which controls how far the control points spread.

    //  Scaling factors: distances from this knot to the previous and following knots.
    var d01 = Math.sqrt(Math.pow(x1 - x0, 2) + Math.pow(y1 - y0, 2));
    var d12 = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

    var fa = t * d01 / (d01 + d12);
    var fb = t - fa;

    var p1x = x1 + fa * (x0 - x2);
    var p1y = y1 + fa * (y0 - y2);

    var p2x = x1 - fb * (x0 - x2);
    var p2y = y1 - fb * (y0 - y2);

    return [p1x, p1y, p2x, p2y];    // p1 is the calculated point, p2 is next control point (would become next segment's p1
}
function drawControlLine(ctx, x, y, px, py) {       // this is the initial user selected control point
    //  Only for demo purposes: show the control line and control points.
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.moveTo(x, y);
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.stroke();
    drawPoint(ctx, px, py, 1.5, "#000000"); // 1.5 is radius
    ctx.restore();

}
/*
function GetCorrectIndex(arr, indx) {  // supports negative index. -1 means last item, -2 means 2nd item from the last
    if (indx >= 0) {
        indx = indx % arr.length;
        return indx;
    }
    if (arr.length == 1)
        return 0;
    
    return arr.length + indx;
}
function calculateInternalEnergy(alpha, beta, prev, p, next) {
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
//function setArray(arr, width, x, y, val) {
    //var index = ((width * y) + x) * 4;
    //arr[index] = val;
//}
*/

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
function drawSpline(ctx, pts, t, closed) {
    //showDetails = document.getElementById('details').checked;
    show_control_lines = $('#show_control_lines').is(':checked');

    layer_snake.clear();

    ctx.lineWidth = 1;
    //ctx.save();
    var cp = [];   // array of control points, as x0,y0,x1,y1,...
    var n = pts.length;



    if (closed) {
        //   Append and prepend knots and control points to close the curve
        pts.push(pts[0], pts[1], pts[2], pts[3]);
        pts.unshift(pts[n - 1]);
        pts.unshift(pts[n - 1]);

        for (var i = 0; i < n; i += 2) {
            cp = cp.concat(getControlPoints(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5], t));
        }
        cp = cp.concat(cp[0], cp[1]);


        for (var i = 2; i < n + 2; i += 2) {
            //var color = HSVtoRGB(Math.floor(240 * (i - 2) / (n - 2)), 0.8, 0.8);
            //if (!showDetails) { color = "#555555" }

            color = "#888888";

            ctx.strokeStyle = hexToCanvasColor(color, 0.75);
            //ctx.beginPath();
            //ctx.moveTo(pts[i], pts[i + 1]);
            //ctx.bezierCurveTo(ctx, cp[2 * i - 2], cp[2 * i - 1], cp[2 * i], cp[2 * i + 1], pts[i + 2], pts[i + 3]);
            myBezierCurveTo(ctx, 1 / (parseFloat($('#bezier_slider_textbox').val()) + 1), pts[i], pts[i + 1], cp[2 * i - 2], cp[2 * i - 1], cp[2 * i], cp[2 * i + 1], pts[i + 2], pts[i + 3]);
            //ctx.stroke();
            //ctx.closePath();
            //if (showDetails) {
            if (t > 0 && show_control_lines) {        // only if there's tension
                drawControlLine(ctx, pts[i], pts[i + 1], cp[2 * i - 2], cp[2 * i - 1]);
                drawControlLine(ctx, pts[i + 2], pts[i + 3], cp[2 * i], cp[2 * i + 1]);
            }
            //}
        }
    }




    /* else {   // OPEN CURVE
    // Draw an open curve, not connected at the ends
    for (var i = 0; i < n - 4; i += 2) {
        cp = cp.concat(getControlPoints(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], pts[i + 4], pts[i + 5], t));
    }
    for (var i = 2; i < pts.length - 5; i += 2) {
        var color = HSVtoRGB(Math.floor(240 * (i - 2) / (n - 2)), 0.8, 0.8);
        if (!showDetails) { color = "#555555" }
        ctx.strokeStyle = hexToCanvasColor(color, 0.75);
        ctx.beginPath();
        ctx.moveTo(pts[i], pts[i + 1]);
        ctx.bezierCurveTo(cp[2 * i - 2], cp[2 * i - 1], cp[2 * i], cp[2 * i + 1], pts[i + 2], pts[i + 3]);
        ctx.stroke();
        ctx.closePath();
        if (showDetails) {
            drawControlLine(ctx, pts[i], pts[i + 1], cp[2 * i - 2], cp[2 * i - 1]);
            drawControlLine(ctx, pts[i + 2], pts[i + 3], cp[2 * i], cp[2 * i + 1]);
        }
    }
    //  For open curves the first and last arcs are simple quadratics.
    var color = HSVtoRGB(40, 0.4, 0.4);  // brown
    if (!showDetails) { color = "#555555" }
    ctx.strokeStyle = hexToCanvasColor(color, 0.75);
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    ctx.quadraticCurveTo(cp[0], cp[1], pts[2], pts[3]);
    ctx.stroke();
    ctx.closePath();

    var color = HSVtoRGB(240, 0.8, 0.8); // indigo
    if (!showDetails) { color = "#555555" }
    ctx.strokeStyle = hexToCanvasColor(color, 0.75);
    ctx.beginPath();
    ctx.moveTo(pts[n - 2], pts[n - 1]);
    ctx.quadraticCurveTo(cp[2 * n - 10], cp[2 * n - 9], pts[n - 4], pts[n - 3]);
    ctx.stroke();
    ctx.closePath();

    // always show control point
    if (showDetails) {
        drawControlLine(ctx, pts[2], pts[3], cp[0], cp[1]);
        drawControlLine(ctx, pts[n - 4], pts[n - 3], cp[2 * n - 10], cp[2 * n - 9]);
    }
}
*/



    //ctx.restore();

    //drawAllControlPoints();
}

