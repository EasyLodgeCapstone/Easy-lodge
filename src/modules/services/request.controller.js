const RequestService = require("./request.service.js");

class RequestController {

    async createRequest(req, res, next) {
        try {
            const  request = await RequestService.createRequest(req.user.id, req.body);
           res.status(201).json({
            success: true,
            message: "Service request created successfully",
            data: request
           });
        } catch (error) {
            res.status(500).json({
                success: false, 
                message: "Failed to create service request",
                error: error.message
            });
        }
    }
   async getUserRequests(req, res, next) {
        try {
            const requests = await RequestService.getUserRequests(req.user.id);
            res.status(200).json({
                success: true,
                message: "Service requests retrieved successfully",
                data: requests
            });
        } catch (error) {
            res.status(500).json({
                success: false, 
                message: "Failed to retrieve service requests",
                error: error.message
            });
        }
    }

    async getRequestById(req, res, next) {
        try {
            const request = await RequestService.getRequestById(req.params.id);
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: "Service request not found"
                });
            }
            res.status(200).json({
                success: true,
                message: "Service request retrieved successfully",
                data: request
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to retrieve service request",
                error: error.message
            });
        }
    }
    async updateStatus(req, res, next) {
        try {
            const {id} = req.params;
            const {status} = req.body;
            const result = await RequestService.updateRequestStatus(id, status);
            res.status(200).json({
                success: true,
                message: "Service request status updated successfully",
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to update service request status",
                error: error.message
            });
        }
    }
}

module.exports = new RequestController();