export const store = {
    state: {
        billOpen: false,
        items: [], // {code,name,qty,price,total,note}
    },

    openBill() {
        this.state.billOpen = true;
        this.state.items = [];
    },

    closeBill() {
        this.state.billOpen = false;
        this.state.items = [];
    },

    addItem({ code, name, qty, price, note }) {
        const total = price * qty;
        this.state.items.push({ code, name, qty, price, total, note });
    },

    removeItem(index) {
        this.state.items.splice(index, 1);
    },

    getTotals() {
        const subtotal = this.state.items.reduce((s, it) => s + it.total, 0);
        const discount = 0; // ธีมก่อน (อนาคตใส่คูปอง/โปร)
        const net = subtotal + discount;
        return { subtotal, discount, net };
    }
};
