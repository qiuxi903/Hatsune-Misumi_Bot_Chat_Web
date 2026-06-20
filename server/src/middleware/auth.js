import jwt from 'jsonwebtoken'
import db from '../utils/db.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET === 'your_jwt_secret_here') {
  console.error('⚠️  请在 .env 文件中设置 JWT_SECRET')
  process.exit(1)
}

// 认证中间件
export const authenticate = (req, res, next) => {
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

    // 返回用户信息（不包含密码）
    const { password_hash, ...userInfo } = user

    // 将用户信息添加到请求对象
    req.user = userInfo
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

    console.error('认证错误:', error)
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
}

// 可选认证中间件（不强制要求登录）
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const decoded = jwt.verify(token, JWT_SECRET)
      const user = db.users.getById(decoded.userId)
      if (user) {
        const { password_hash, ...userInfo } = user
        req.user = userInfo
      }
    }
  } catch (error) {
    // 忽略认证错误
  }
  next()
}

// 生成JWT令牌
export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '3h'
  })
}

// 验证JWT令牌
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}
