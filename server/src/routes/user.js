import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import db from '../utils/db.js'
import { authenticate } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// 配置文件上传
const uploadDir = path.join(__dirname, '../../uploads/avatars')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = path.extname(file.originalname)
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('只允许上传图片文件'), false)
    }
  }
})

// 获取用户信息
router.get('/profile', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  })
})

// 更新用户信息
router.put('/profile', authenticate, (req, res) => {
  try {
    const { nickname, bio, qq_number } = req.body
    const userId = req.user.id

    // 验证QQ号格式（如果提供）
    if (qq_number && !/^\d{5,12}$/.test(qq_number)) {
      return res.status(400).json({
        success: false,
        message: 'QQ号格式不正确，应为5-12位数字'
      })
    }

    // 更新用户信息
    const updatedUser = db.users.update(userId, {
      nickname: nickname || null,
      bio: bio || null,
      qq_number: qq_number || null
    })

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 返回更新后的用户信息（不包含密码）
    const { password_hash, ...userInfo } = updatedUser

    res.json({
      success: true,
      message: '用户信息更新成功',
      user: userInfo
    })
  } catch (error) {
    console.error('更新用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 上传头像
router.post('/avatar', authenticate, upload.single('avatar'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的头像'
      })
    }

    const userId = req.user.id
    const avatarUrl = `/uploads/avatars/${req.file.filename}`

    // 删除旧头像
    const oldUser = db.users.getById(userId)
    if (oldUser.avatar) {
      const oldAvatarPath = path.join(__dirname, '../..', oldUser.avatar)
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath)
      }
    }

    // 更新头像URL
    db.users.update(userId, { avatar: avatarUrl })

    res.json({
      success: true,
      message: '头像上传成功',
      avatar: avatarUrl
    })
  } catch (error) {
    console.error('上传头像错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取用户列表（管理员功能）
router.get('/list', authenticate, (req, res) => {
  try {
    const users = db.users.getAll()

    // 返回用户列表（不包含密码）
    const safeUsers = users.map(({ password_hash, ...user }) => user)

    res.json({
      success: true,
      users: safeUsers
    })
  } catch (error) {
    console.error('获取用户列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取指定用户信息
router.get('/:id', authenticate, (req, res) => {
  try {
    const userId = req.params.id

    const user = db.users.getById(userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 返回用户信息（不包含密码）
    const { password_hash, ...userInfo } = user

    res.json({
      success: true,
      user: userInfo
    })
  } catch (error) {
    console.error('获取用户信息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

export default router
