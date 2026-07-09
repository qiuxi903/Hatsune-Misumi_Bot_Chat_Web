import { Router } from 'express'
import db from '../utils/db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// 获取用户的收藏列表
router.get('/', authenticate, (req, res) => {
  try {
    const userId = req.user.id
    const favorites = db.favorites.getAll(userId)

    res.json({
      success: true,
      favorites,
      count: favorites.length,
      maxCount: db.favorites.MAX_COUNT
    })
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 添加收藏
router.post('/', authenticate, (req, res) => {
  try {
    const userId = req.user.id
    const { imageData } = req.body

    if (!imageData) {
      return res.status(400).json({
        success: false,
        message: '图片数据不能为空'
      })
    }

    const result = db.favorites.add(userId, imageData)

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      })
    }

    res.status(201).json({
      success: true,
      favorite: result,
      message: '收藏成功'
    })
  } catch (error) {
    console.error('添加收藏失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 删除收藏
router.delete('/:id', authenticate, (req, res) => {
  try {
    const userId = req.user.id
    const favoriteId = req.params.id

    const result = db.favorites.delete(userId, favoriteId)

    if (result.error) {
      return res.status(404).json({
        success: false,
        message: result.error
      })
    }

    res.json({
      success: true,
      message: '取消收藏成功'
    })
  } catch (error) {
    console.error('删除收藏失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

export default router
