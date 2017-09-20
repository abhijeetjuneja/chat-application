//Standard response generator
//All responses appear in console
exports.generate = function(error,message,status,data){

	var myResponse = {
                error: error,
                message: message,
                status: status,
                data: data
    };

    return myResponse;

};