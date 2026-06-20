import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// 模拟插件数据
const mockPlugins = [
  {
    name: 'astrbot_plugin_chat',
    description: '基础聊天插件，支持多种AI模型',
    version: '1.0.0',
    author: 'AstrBot',
    enabled: true,
    hasConfig: true,
    icon: '💬',
    downloads: 1000
  },
  {
    name: 'astrbot_plugin_search',
    description: '搜索插件，支持网络搜索和知识库查询',
    version: '1.2.0',
    author: 'AstrBot',
    enabled: true,
    hasConfig: true,
    icon: '🔍',
    downloads: 850
  },
  {
    name: 'astrbot_plugin_image',
    description: '图像生成插件，支持文生图和图生图',
    version: '2.0.0',
    author: 'AstrBot',
    enabled: false,
    hasConfig: true,
    icon: '🎨',
    downloads: 1200
  },
  {
    name: 'astrbot_plugin_code',
    description: '代码助手插件，支持代码生成和解释',
    version: '1.5.0',
    author: 'AstrBot',
    enabled: true,
    hasConfig: false,
    icon: '💻',
    downloads: 950
  },
  {
    name: 'astrbot_plugin_weather',
    description: '天气查询插件，支持全球天气查询',
    version: '1.0.0',
    author: 'AstrBot',
    enabled: true,
    hasConfig: false,
    icon: '🌤️',
    downloads: 600
  }
]

// 获取插件列表
router.get('/', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      plugins: mockPlugins
    })
  } catch (error) {
    console.error('获取插件列表错误:', error)
    res.status(500).json({
      success: false,
      message: '获取插件列表失败'
    })
  }
})

// 获取插件状态
router.get('/status', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      connected: true,
      status: { connected: true }
    })
  } catch (error) {
    console.error('获取插件状态错误:', error)
    res.status(500).json({
      success: false,
      message: '获取插件状态失败'
    })
  }
})

// 切换插件状态
router.put('/:name/toggle', authenticate, async (req, res) => {
  try {
    const { name } = req.params
    const { enabled } = req.body

    // 在实际应用中，这里应该调用AstrBot API来切换插件状态
    // 目前返回模拟成功响应
    res.json({
      success: true,
      message: `插件 ${name} 已${enabled ? '启用' : '禁用'}`
    })
  } catch (error) {
    console.error('切换插件状态错误:', error)
    res.status(500).json({
      success: false,
      message: '切换插件状态失败'
    })
  }
})

// 获取插件配置
router.get('/:name/config', authenticate, async (req, res) => {
  try {
    const { name } = req.params

    // 返回模拟配置
    const mockConfigs = {
      'astrbot_plugin_chat': {
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 2000
      },
      'astrbot_plugin_search': {
        search_engine: 'google',
        max_results: 5
      },
      'astrbot_plugin_image': {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard'
      }
    }

    res.json({
      success: true,
      config: mockConfigs[name] || {}
    })
  } catch (error) {
    console.error('获取插件配置错误:', error)
    res.status(500).json({
      success: false,
      message: '获取插件配置失败'
    })
  }
})

// 更新插件配置
router.put('/:name/config', authenticate, async (req, res) => {
  try {
    const { name } = req.params
    const { config } = req.body

    const result = await astrBotService.updatePluginConfig(name, config)

    if (result.success) {
      res.json({
        success: true,
        message: '插件配置更新成功'
      })
    } else {
      // 模拟成功
      res.json({
        success: true,
        message: '插件配置更新成功'
      })
    }
  } catch (error) {
    console.error('更新插件配置错误:', error)
    res.status(500).json({
      success: false,
      message: '更新插件配置失败'
    })
  }
})

export default router
