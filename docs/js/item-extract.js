const g_nLowDifference = 35
const g_nUpDifference = 35; //负差最大值、正差最大值 
/**
 * @param {Object} srcMat
 */
function itemExtract (srcMat, name) {
  let scale = 1
  let preMat = preProcess(srcMat, scale)
  let grayMat = getSegmentImage(preMat)
  let lines = getLinesWithDetect(grayMat)
  let points = getIntersections(lines, scale)
  let result = getResultWithMap(srcMat, points)
  cv.imshow(name, result);
  preMat.delete()
  grayMat.delete()
  srcMat.delete()
  result.delete()
}
/**
 * 预处理
 * @param {*} src 
 */
function preProcess (src, scale) {
  let smallMat = resize(src, scale)
  let result = filter(smallMat)
  smallMat.delete()
  return result
}
/**
 * 调整至指定宽高
 * @param {*} src 
 * @param {*} scale 缩放比例 
 */
function resize (src, scale = 1) {
  let smallMat = new cv.Mat();
  let dsize = new cv.Size(0, 0);
  // 缩小一半 
  // TODO 自动按比例缩小到 1k 以内
  cv.resize(src, smallMat, dsize, scale, scale, cv.INTER_AREA)
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
 * 通过分割图像获取前景灰度图
 * @param {*} src 
 */
function getSegmentImage (src) {
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


function getLinesFromData32S (array) {
  let lines = []
  let len = array.length / 4
  for (let i = 0; i < len; ++i) {
    let startPoint = new cv.Point(array[i * 4], array[i * 4 + 1]);
    let endPoint = new cv.Point(array[i * 4 + 2], array[i * 4 + 3]);
    lines.push({
      startPoint,
      endPoint
    })
  }
  return lines
}
/**
 * 直线检测
 * @param {*} mat 
 */
function getLinesWithDetect (src) {
  let dst = new cv.Mat();
  let tmp = new cv.Mat();
  let linesMat = new cv.Mat();
  // Canny 算子进行边缘检测
  cv.Canny(src, tmp, 25, 60, 3);
  // 转化边缘检测后的图为灰度图  
  cv.cvtColor(tmp, dst, cv.COLOR_GRAY2BGR);
  cv.HoughLines(tmp, linesMat, 1, Math.PI / 180, 20, 0, 0);
  let lines = getLinesFromData32S(linesMat.data32S)
  linesMat.delete()
  dst.delete()
  tmp.delete()
  return lines
}
/**
 * 计算交点
 * @param {*} lines 
 */
function getIntersections (lines) {
  let points = []
  points.push(new cv.Point(10, 10))
  points.push(new cv.Point(100, 10))
  points.push(new cv.Point(10, 100))
  points.push(new cv.Point(100, 100))
  return points
}
/**
 * 抠图，映射
 * @param {*} src 
 * @param {*} points 
 */
function getResultWithMap (src, points) {
  let dst = new cv.Mat();
  let dsize = new cv.Size(0, 0);
  let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [157.6, 71.5, 295.6, 118.4, 172.4, 311.3, 2.4, 202.4]);
  let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, 300, 0, 300, 400, 0, 400]);
  let M = cv.getPerspectiveTransform(srcTri, dstTri);
  cv.warpPerspective(src, dst, M, dsize);
  M.delete(); srcTri.delete(); dstTri.delete();
  return dst
}