const g_nLowDifference = 35
const g_nUpDifference = 35; //负差最大值、正差最大值 
const UNCAL_THETA = 0.5;
class Line {
  constructor(rho, theta) {
    this.rho = rho
    this.theta = theta
    let a = Math.cos(theta);
    let b = Math.sin(theta);
    let x0 = a * rho;
    let y0 = b * rho;
    this.startPoint = { x: x0 - 400 * b, y: y0 + 400 * a };
    this.endPoint = { x: x0 + 400 * b, y: y0 - 400 * a };
  }
}
/**
 * @param {Object} srcMat
 */
function itemExtract (srcMat, name) {
  let scale = getScale(Math.max(srcMat.rows, srcMat.cols))
  let preMat = preProcess(srcMat, scale)
  let grayMat = getSegmentImage(preMat)
  let lines = getLinesWithDetect(grayMat)
  let points = getFourVertex(lines, scale, { height: srcMat.rows, width: srcMat.cols })
  let result = getResultWithMap(srcMat, points)
  cv.imshow(name, result);
  preMat.delete()
  grayMat.delete()
  srcMat.delete()
  result.delete()
}
/**
 * 获取缩放比例
 * @param {*} len 
 */
function getScale (len) {
  let scale = 1
  while (len > 200) {
    scale /= 2
    len >>= 1
  }
  return scale
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


function getLinesFromData32F (data32F) {
  let lines = []
  let len = data32F.length / 2
  for (let i = 0; i < len; ++i) {
    let rho = data32F[i * 2];
    let theta = data32F[i * 2 + 1];
    lines.push(new Line(rho, theta))
  }
  return lines
}
/**
 * 直线检测
 * @param {*} mat 
 */
function getLinesWithDetect (src) {
  let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
  let lines = new cv.Mat();
  // Canny 算子进行边缘检测
  cv.Canny(src, src, 50, 200, 3);
  cv.HoughLines(src, lines, 1, Math.PI / 180,
    30, 0, 0, 0, Math.PI);
  // draw lines
  for (let i = 0; i < lines.rows; ++i) {
    let rho = lines.data32F[i * 2];
    let theta = lines.data32F[i * 2 + 1];
    let a = Math.cos(theta);
    let b = Math.sin(theta);
    let x0 = a * rho;
    let y0 = b * rho;
    let startPoint = { x: x0 - 400 * b, y: y0 + 400 * a };
    let endPoint = { x: x0 + 400 * b, y: y0 - 400 * a };
    cv.line(dst, startPoint, endPoint, [255, 0, 0, 255]);
  }
  let lineArray = getLinesFromData32F(lines.data32F)
  // drawLineMat(src.rows, src.cols, lineArray)
  return lineArray
}
/**
 * 计算两直线间的交点
 * @param {*} l1 
 * @param {*} l2 
 */
function getIntersection (l1, l2) {
  //角度差太小 不算，
  let minTheta = Math.min(l1.theta, l2.theta)
  let maxTheta = Math.max(l1.theta, l2.theta)
  if (Math.abs(l1.theta - l2.theta) < UNCAL_THETA || Math.abs(minTheta + Math.PI - maxTheta) < UNCAL_THETA) {
    return;
  }
  //计算两条直线的交点
  let intersection;
  //y = a * x + b;
  let a1 = Math.abs(l1.startPoint.x - l1.endPoint.x) < Number.EPSILON ? 0 : (l1.startPoint.y - l1.endPoint.y) / (l1.startPoint.x - l1.endPoint.x);
  let b1 = l1.startPoint.y - a1 * (l1.startPoint.x);
  let a2 = Math.abs((l2.startPoint.x - l2.endPoint.x)) < Number.EPSILON ? 0 : (l2.startPoint.y - l2.endPoint.y) / (l2.startPoint.x - l2.endPoint.x);
  let b2 = l2.startPoint.y - a2 * (l2.startPoint.x);
  if (Math.abs(a2 - a1) > Number.EPSILON) {
    let x = (b1 - b2) / (a2 - a1)
    let y = a1 * x + b1
    intersection = { x, y }
  }
  return intersection
}
/**
 * 计算所有交点
 * @param {*} lines 
 */
function getAllIntersections (lines) {
  let points = []
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      let point = getIntersection(lines[i], lines[j])
      if (point) {
        points.push(point)
      }
    }
  }
  return points
}
/**
 * 聚类取均值
 * @param {*} points 
 * @param {*} param1 
 */
function getClusterPoints (points, { width, height }) {
  points.sort((p1, p2) => {
    if (p1.x !== p2.x) {
      return p1.x - p2.x
    } else {
      return p1.y - p2.y
    }
  })
  const distance = Math.max(40, (width + height) / 20)
  const isNear = (p1, p2) => Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) < distance
  let clusters = [[points[0]]]
  for (let i = 1; i < points.length; i++) {
    if (isNear(points[i], points[i - 1])) {
      clusters[clusters.length - 1].push(points[i])
    } else {
      clusters.push([points[i]])
    }
  }
  // 除去量最少的，仅保留四个聚类
  clusters = clusters.sort((c1, c2) => c2.length - c1.length).slice(0, 4)
  const result = clusters.map(cluster => {
    const x = ~~(cluster.reduce((sum, cur) => sum + cur.x, 0) / cluster.length)
    const y = ~~(cluster.reduce((sum, cur) => sum + cur.y, 0) / cluster.length)
    return { x, y }
  })
  return result
}
/**
 * 顺时针排序，以中心点左上角为第一个点
 * @param {*} points 
 */
function getSortedVertex (points) {
  let center = {
    x: points.reduce((sum, p) => sum + p.x, 0) / 4,
    y: points.reduce((sum, p) => sum + p.y, 0) / 4
  }
  let sortedPoints = []
  sortedPoints.push(points.find(p => p.x < center.x && p.y < center.y))
  sortedPoints.push(points.find(p => p.x > center.x && p.y < center.y))
  sortedPoints.push(points.find(p => p.x > center.x && p.y > center.y))
  sortedPoints.push(points.find(p => p.x < center.x && p.y > center.y))
  return sortedPoints
}

/**
 * 根据聚类获得四个顶点的坐标
 */
function getFourVertex (lines, scale, { width, height }) {
  // 缩放 + 过滤
  let allPoints = getAllIntersections(lines).map(point => ({
    x: ~~(point.x / scale), y: ~~(point.y / scale)
  })).filter(({ x, y }) => !(x < 0 || x > width || y < 0 || y > height))
  const points = getClusterPoints(allPoints, { width, height })
  const sortedPoints = getSortedVertex(points)
  return sortedPoints
}
/**
 * 抠图，映射
 * @param {*} src 
 * @param {*} points 
 */
function getResultWithMap (src, points) {
  let array = []
  points.forEach(point => {
    array.push(point.x)
    array.push(point.y)
  })
  console.log(points, array)
  let dst = new cv.Mat();
  let dsize = new cv.Size(0, 0);
  let dstWidth = src.cols
  let dstHeight = src.rows
  let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, array);
  let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, dstWidth, 0, dstWidth, dstHeight, 0, dstHeight]);
  let M = cv.getPerspectiveTransform(srcTri, dstTri);
  cv.warpPerspective(src, dst, M, dsize);
  let resizeDst = resize(dst, 0.5)
  M.delete(); srcTri.delete(); dstTri.delete(); dst.delete()
  return resizeDst
}
function drawLineMat (rows, cols, lines) {
  let dst = cv.Mat.zeros(rows, cols, cv.CV_8UC3);
  let color = new cv.Scalar(255, 0, 0);
  for (let line of lines) {
    cv.line(dst, line.startPoint, line.endPoint, color);
  }
  cv.imshow("canvasOutput", dst);
}