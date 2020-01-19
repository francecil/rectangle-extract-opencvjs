const g_nLowDifference = 35
const g_nUpDifference = 35; //负差最大值、正差最大值 
/**
 * @param {Object} sourceMat
 */
function itemExtract (sourceMat, name) {
  let preMat = preProcess(sourceMat)
  let foregroundMat = segmentImage(preMat)
  let result = detectLine(foregroundMat)
  cv.imshow(name, result);
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
 * 滤波：保边去噪
 * @param {*} mat 
 */
function filter (src) {
  let dst = new cv.Mat();
  cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
  // 双边滤波
  cv.bilateralFilter(src, dst, 9, 75, 75, cv.BORDER_DEFAULT);
  return dst
}
/**
 * 分割图像
 * @param {*} src 
 */
function segmentImage (src) {
  const mask = new cv.Mat(src.rows + 2, src.cols + 2, cv.CV_8U, [0, 0, 0, 0])
  const seed = new cv.Point(src.cols >> 1, src.rows >> 1)
  let flags = 4 + (255 << 8) + cv.FLOODFILL_FIXED_RANGE
  let ccomp = new cv.Rect()
  let newVal = new cv.Scalar(255, 255, 255)
  // 选取中点，采用floodFill漫水填充
  cv.threshold(mask, mask, 1, 128, cv.THRESH_BINARY);
  cv.floodFill(src, mask, seed, newVal, ccomp, new cv.Scalar(g_nLowDifference, g_nLowDifference, g_nLowDifference), new cv.Scalar(g_nUpDifference, g_nUpDifference, g_nUpDifference), flags);
  // 再次执行一次滤波去除噪点
  cv.medianBlur(mask, mask, 9);
  return mask
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
  let dst = new cv.Mat();
  let tmp = new cv.Mat();
  let lines = new cv.Mat();
  let color = new cv.Scalar(255, 0, 0);
  // Canny 算子进行边缘检测
  cv.Canny(src, tmp, 25, 60, 3);
  // 转化边缘检测后的图为灰度图  
  cv.cvtColor(tmp, dst, cv.COLOR_GRAY2BGR);
  cv.HoughLines(tmp, lines, 1, Math.PI / 180, 20, 0, 0);
  console.log(lines)
  // draw lines
  for (let i = 0; i < lines.rows; ++i) {
    let startPoint = new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]);
    let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);
    cv.line(dst, startPoint, endPoint, color);
  }
  return dst
}