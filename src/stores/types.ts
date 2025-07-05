export interface Category {
  id: string
  name: string
  is_default: boolean
  user_id: string
  created_at: string
}

export interface Expense {
  id: string
  amount: number
  description: string
  date: string
  category_id: string
  user_id: string
  group_id: string | null
  created_at: string
  categories: {
    name: string
  }
}

export interface Group {
  id: string
  name: string
  created_by: string
  created_at: string
  members: GroupMember[]
}

export interface GroupMember {
  id: string
  user_id: string
  user_email?: string
  joined_at: string
}

export interface SharedExpense {
  id: string
  amount: number
  description: string
  date: string
  paid_by: string
  paid_by_email?: string
  category: {
    id: string
    name: string
  }
  group_id: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  group_id?: string
}