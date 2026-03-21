class PaymentPaystackController {
  constructor(paystackService) {
    this.paystackService = paystackService;
  }

  initializeTransaction = async (req, res) => {
    const { email, amount } = req.body;

    try {
      const result = await this.paystackService.initializeTransaction(
        email,
        amount,
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  verifyTransaction = async (req, res) => {
    const { reference } = req.params;

    try {
      const result = await this.paystackService.verifyTransaction(reference);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  
}

module.exports = PaymentPaystackController;