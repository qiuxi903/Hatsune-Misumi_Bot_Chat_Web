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

// 初始化数据文件
const initDataFile = (filePath, defaultData = []) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2))
  }
}

initDataFile(usersFile)
initDataFile(sessionsFile)
initDataFile(messagesFile)

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
      return sessions.filter(s => s.user_id === userId)
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
      return messages.filter(m => m.session_id === sessionId)
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
  }
}

export default db
