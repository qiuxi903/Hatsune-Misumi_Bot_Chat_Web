import jwt from 'jsonwebtoken'
import db from '../utils/db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here'

// 管理员邮箱白名单
const ADMIN_EMAILS = ['anr1003@163.com']

// 管理员认证中间件
export const requireAdmin = (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      })
    }

    const token = authHeader.split(' ')[1]

    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET)

    // 查询用户信息
    const user = db.users.getById(decoded.userId)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 检查是否是管理员（邮箱白名单）
    const isAdminUser = ADMIN_EMAILS.includes(user.email) || user.is_admin === true

    if (!isAdminUser) {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      })
    }

    // 将用户信息添加到请求对象
    req.user = user
    req.isAdmin = true
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '认证令牌已过期'
      })
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌'
      })
    }

    console.error('管理员认证错误:', error)
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}
