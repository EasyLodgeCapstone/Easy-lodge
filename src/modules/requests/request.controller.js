const RequestService = require("./request.service.js");
const AppError = require("../../middleware/appError.js");

class RequestController {

    async createRequest(req, res, next) {
        try {
            const  request = await RequestService.createRequest(req.user.id, req.body);
           res.status(201).json({
            success: true,
            message: "Service request created successfully",
            data: request,
           });
        } catch (error) {
            next(error);
        }
    }
    async getUserRequests(req, res, next) {
        try {
            const result = await RequestService.getUserRequests(req.user.id, req.query);
            res.status(200).json({
                success: true,
                message: "Service requests retrieved successfully",
                data: result.requests,
                pagination: {
                    total: result.total,
                    limit: result.limit,
                    offset: result.offset,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getAllRequests(req, res, next) {
        try {
            const result = await RequestService.getAllRequests(req.query);
            res.status(200).json({
                success: true,
                message: "All service requests retrieved successfully",
                data: result.requests,
                pagination: {
                    total: result.total,
                    limit: result.limit,
                    offset: result.offset,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    async getRequestById(req, res, next) {
        try {
            const request = await RequestService.getRequestById(parseInt(req.params.id)); 
            if (!request) {
                return next(new AppError("Service request not found", 404));
            }
            res.status(200).json({
                success: true,
                message: "Service request retrieved successfully",
                data: request,
            });
        } catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const result = await RequestService.updateRequestStatus(
                parseInt(req.params.id),
                req.body.status
            );
            if (!result) {
                return next(new AppError("Service request not found", 404));
            }
            res.status(200).json({
                success: true,
                message: "Service request status updated successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async cancelRequest(req, res, next){
        try {
            const request = await RequestService.cancelRequest(
                parseInt(req.params.id),
                req.user.id
            );
            res.status(200).json({
                success: true,
                message: "Service request cancelled successfully",
                data: request,
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RequestController();