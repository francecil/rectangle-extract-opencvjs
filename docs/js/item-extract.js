/**
 * @param {Object} sourceMat
 */
function itemExtract (sourceMat) {
  let preMat = preProcess(sourceMat)
  let foregroundMat = segmentImage(preMat)
  let result = detectLine(foregroundMat)
  return result
}
/**
 * 预处理
 * @param {*} src 
 */
function preProcess (src) {
  let smallMat = resize(src)
  return filter(smallMat)
}
/**
 * 调整至指定宽高
 * @param {*} src 
 * @param {*} size 
 */
function resize (src) {
  let smallMat = new cv.Mat();
  let dsize = new cv.Size(0, 0);
  // 缩小一半 
  // TODO 自动按比例缩小到 1k 以内
  cv.resize(src, smallMat, dsize, 0.5, 0.5, cv.INTER_AREA)
  return smallMat
}
/**
 * 保边去噪
 * @param {*} mat 
 */
function filter (src) {
  let dst = new cv.Mat();
  cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
  // 双边滤波
  cv.bilateralFilter(src, dst, 9, 75, 75, cv.BORDER_DEFAULT);
  return dst
}
function segmentImage (src) {
  let gray = new cv.Mat();

  // gray and threshold image
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  cv.threshold(gray, gray, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
  return gray
}
/**
 * 提取前景
 * @param {*} src 
 */
function extractForeground (src) {
  cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
  let mask = new cv.Mat();
  let bgdModel = new cv.Mat();
  let fgdModel = new cv.Mat();
  let rect = new cv.Rect(0, 0, src.cols, src.rows);
  cv.grabCut(src, mask, rect, bgdModel, fgdModel, 1, cv.GC_INIT_WITH_RECT);
  // draw foreground
  for (let i = 0; i < src.rows; i++) {
    for (let j = 0; j < src.cols; j++) {
      if (mask.ucharPtr(i, j)[0] == 0 || mask.ucharPtr(i, j)[0] == 2) {
        src.ucharPtr(i, j)[0] = 0;
        src.ucharPtr(i, j)[1] = 0;
        src.ucharPtr(i, j)[2] = 0;
      }
    }
  }
  return src
}
/**
 * 直线检测
 * @param {*} mat 
 */
function detectLine (src) {
  let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
  let lines = new cv.Mat();
  let color = new cv.Scalar(255, 0, 0);
  // Canny 算子进行边缘检测
  cv.Canny(src, src, 25, 60, 3);
  // You can try more different parameters
  cv.HoughLinesP(src, lines, 1, Math.PI / 180, 50, 0, 0);
  // draw lines
  for (let i = 0; i < lines.rows; ++i) {
    let startPoint = new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]);
    let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);
    cv.line(dst, startPoint, endPoint, color);
  }
  return dst
}