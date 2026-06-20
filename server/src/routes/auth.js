import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../utils/db.js'
import { authenticate, generateToken } from '../middleware/auth.js'

const router = Router()

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, qq_number } = req.body

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名、邮箱和密码为必填项'
      })
    }

    // 验证QQ号格式（如果提供）
    if (qq_number && !/^\d{5,12}$/.test(qq_number)) {
      return res.status(400).json({
        success: false,
        message: 'QQ号格式不正确，应为5-12位数字'
      })
    }

    // 验证用户名长度
    if (username.length < 2 || username.length > 50) {
      return res.status(400).json({
        success: false,
        message: '用户名长度应在2-50个字符之间'
      })
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确'
      })
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密码长度不能少于6个字符'
      })
    }

    // 检查用户名是否已存在
    const existingUserByUsername = db.users.getByUsername(username)
    if (existingUserByUsername) {
      return res.status(400).json({
        success: false,
        message: '用户名已被注册'
      })
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = db.users.getByEmail(email)
    if (existingUserByEmail) {
      return res.status(400).json({
        success: false,
        message: '邮箱已被注册'
      })
    }

    // 加密密码
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // 创建用户
    const newUser = db.users.create({
      username,
      email,
      password_hash: passwordHash,
      nickname: username,
      qq_number: qq_number || null,
      avatar: null,
      bio: null
    })

    // 生成JWT令牌
    const token = generateToken(newUser.id)

    // 返回用户信息（不包含密码）
    const { password_hash, ...userInfo } = newUser

    res.status(201).json({
      success: true,
      message: '注册成功',
      token,
      user: userInfo
    })
  } catch (error) {
    console.error('注册错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码为必填项'
      })
    }

    // 查询用户（支持用户名或邮箱登录）
    let user = db.users.getByUsername(username)
    if (!user) {
      user = db.users.getByEmail(username)
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      })
    }

    // 生成JWT令牌
    const token = generateToken(user.id)

    // 返回用户信息（不包含密码）
    const { password_hash, ...userInfo } = user

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: userInfo
    })
  } catch (error) {
    console.error('登录错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取当前用户信息
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  })
})

// 修改密码
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.id

    // 验证必填字段
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码和新密码为必填项'
      })
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于6个字符'
      })
    }

    // 获取当前用户信息
    const user = db.users.getById(userId)

    // 验证当前密码
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '当前密码错误'
      })
    }

    // 加密新密码
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(newPassword, salt)

    // 更新密码
    db.users.update(userId, { password_hash: passwordHash })

    res.json({
      success: true,
      message: '密码修改成功'
    })
  } catch (error) {
    console.error('修改密码错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

export default router
