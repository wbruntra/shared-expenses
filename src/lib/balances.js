import { roundMoney } from './data.js'

const EPSILON = 0.005

export function calculateBalances(data) {
  const balances = Object.fromEntries(data.people.map((p) => [p.id, 0]))

  for (const expense of data.expenses) {
    if (!expense.paidBy) continue
    const amount = Number(expense.amount) || 0
    balances[expense.paidBy] = (balances[expense.paidBy] || 0) + amount

    for (const [personId, share] of Object.entries(expense.split)) {
      balances[personId] = (balances[personId] || 0) - (Number(share) || 0)
    }
  }

  for (const payment of data.payments) {
    const amount = Number(payment.amount) || 0
    // Paying someone reduces the payer's debt and reduces the receiver's credit.
    balances[payment.from] = (balances[payment.from] || 0) + amount
    balances[payment.to] = (balances[payment.to] || 0) - amount
  }

  return Object.fromEntries(
    Object.entries(balances).map(([id, value]) => [id, roundMoney(value)])
  )
}

export function calculateSettlement(data) {
  const balances = calculateBalances(data)
  const peopleById = Object.fromEntries(data.people.map((p) => [p.id, p]))

  const debtors = []
  const creditors = []

  for (const [id, balance] of Object.entries(balances)) {
    if (!peopleById[id]) continue
    if (balance < -EPSILON) {
      debtors.push({ id, balance })
    } else if (balance > EPSILON) {
      creditors.push({ id, balance })
    }
  }

  debtors.sort((a, b) => a.balance - b.balance)
  creditors.sort((a, b) => b.balance - a.balance)

  const settlements = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = roundMoney(Math.min(-debtor.balance, creditor.balance))

    if (amount <= EPSILON) break

    settlements.push({
      from: debtor.id,
      to: creditor.id,
      amount,
    })

    debtor.balance = roundMoney(debtor.balance + amount)
    creditor.balance = roundMoney(creditor.balance - amount)

    if (debtor.balance > -EPSILON) i++
    if (creditor.balance < EPSILON) j++
  }

  return settlements
}
