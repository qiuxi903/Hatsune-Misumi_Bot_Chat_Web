import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据目录
const dataDir = path.join(__dirname, '../../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// 数据文件路径
const usersFile = path.join(dataDir, 'users.json')
const sessionsFile = path.join(dataDir, 'sessions.json')
const messagesFile = path.join(dataDir, 'messages.json')
const favoritesFile = path.join(dataDir, 'favorites.json')

// 初始化数据文件
const initDataFile = (filePath, defaultData = []) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2))
  }
}

initDataFile(usersFile)
initDataFile(sessionsFile)
initDataFile(messagesFile)
initDataFile(favoritesFile)

// 读取数据
const readData = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error(`读取数据文件失败: ${filePath}`, error)
    return []
  }
}

// 写入数据
const writeData = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
    return true
  } catch (error) {
    console.error(`写入数据文件失败: ${filePath}`, error)
    return false
  }
}

// 生成ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 数据库操作封装
const db = {
  // 用户操作
  users: {
    getAll() {
      return readData(usersFile)
    },
    getById(id) {
      const users = readData(usersFile)
      return users.find(u => u.id === id)
    },
    getByUsername(username) {
      const users = readData(usersFile)
      return users.find(u => u.username === username)
    },
    getByEmail(email) {
      const users = readData(usersFile)
      return users.find(u => u.email === email)
    },
    create(userData) {
      const users = readData(usersFile)
      const newUser = {
        id: generateId(),
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      users.push(newUser)
      writeData(usersFile, users)
      return newUser
    },
    update(id, updateData) {
      const users = readData(usersFile)
      const index = users.findIndex(u => u.id === id)
      if (index === -1) return null
      users[index] = {
        ...users[index],
        ...updateData,
        updated_at: new Date().toISOString()
      }
      writeData(usersFile, users)
      return users[index]
    },
    delete(id) {
      const users = readData(usersFile)
      const filteredUsers = users.filter(u => u.id !== id)
      writeData(usersFile, filteredUsers)
      return true
    }
  },

  // 会话操作
  sessions: {
    getAll(userId) {
      const sessions = readData(sessionsFile)
      if (userId) {
        return sessions.filter(s => s.user_id === userId)
      }
      return sessions // 没有userId时返回所有会话
    },
    getById(id) {
      const sessions = readData(sessionsFile)
      return sessions.find(s => s.id === id)
    },
    create(sessionData) {
      const sessions = readData(sessionsFile)
      const newSession = {
        id: generateId(),
        ...sessionData,
        astrbot_session_id: sessionData.astrbot_session_id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      sessions.push(newSession)
      writeData(sessionsFile, sessions)
      return newSession
    },
    update(id, updateData) {
      const sessions = readData(sessionsFile)
      const index = sessions.findIndex(s => s.id === id)
      if (index === -1) return null
      sessions[index] = {
        ...sessions[index],
        ...updateData,
        updated_at: new Date().toISOString()
      }
      writeData(sessionsFile, sessions)
      return sessions[index]
    },
    delete(id) {
      const sessions = readData(sessionsFile)
      const filteredSessions = sessions.filter(s => s.id !== id)
      writeData(sessionsFile, filteredSessions)
      // 同时删除该会话的所有消息
      const messages = readData(messagesFile)
      const filteredMessages = messages.filter(m => m.session_id !== id)
      writeData(messagesFile, filteredMessages)
      return true
    }
  },

  // 消息操作
  messages: {
    getAll(sessionId) {
      const messages = readData(messagesFile)
      if (sessionId) {
        return messages.filter(m => m.session_id === sessionId)
      }
      return messages // 没有sessionId时返回所有消息
    },
    getById(id) {
      const messages = readData(messagesFile)
      return messages.find(m => m.id === id)
    },
    create(messageData) {
      const messages = readData(messagesFile)
      const newMessage = {
        id: generateId(),
        ...messageData,
        created_at: new Date().toISOString()
      }
      messages.push(newMessage)
      writeData(messagesFile, messages)
      return newMessage
    },
    delete(id) {
      const messages = readData(messagesFile)
      const filteredMessages = messages.filter(m => m.id !== id)
      writeData(messagesFile, filteredMessages)
      return true
    }
  },

  // 壁纸收藏操作
  favorites: {
    MAX_COUNT: 9,
    getAll(userId) {
      const favorites = readData(favoritesFile)
      if (userId) {
        return favorites.filter(f => f.user_id === userId)
      }
      return favorites // 没有userId时返回所有收藏
    },
    add(userId, imageData) {
      const favorites = readData(favoritesFile)
      // 检查用户收藏数量
      const userFavorites = favorites.filter(f => f.user_id === userId)
      if (userFavorites.length >= 9) {
        return { error: '最多收藏9张壁纸' }
      }
      // 检查是否已收藏
      if (userFavorites.some(f => f.image_data === imageData)) {
        return { error: '已经收藏过这张壁纸' }
      }
      const newFavorite = {
        id: generateId(),
        user_id: userId,
        image_data: imageData,
        created_at: new Date().toISOString()
      }
      favorites.push(newFavorite)
      writeData(favoritesFile, favorites)
      return newFavorite
    },
    delete(userId, favoriteId) {
      const favorites = readData(favoritesFile)
      const favorite = favorites.find(f => f.id === favoriteId && f.user_id === userId)
      if (!favorite) {
        return { error: '收藏不存在' }
      }
      const filteredFavorites = favorites.filter(f => f.id !== favoriteId)
      writeData(favoritesFile, filteredFavorites)
      return { success: true }
    },
    getCount(userId) {
      const favorites = readData(favoritesFile)
      return favorites.filter(f => f.user_id === userId).length
    }
  }
}

export default db
