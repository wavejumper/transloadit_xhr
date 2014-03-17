/* This file handles uploading to Transloadit, a 3rd party service.
 It was originally written by the Transloadit team, but we may
 end up modifying it more in the future.
 */

(function(window) {


    function TransloaditXhr(opts) {
        this.params = opts.params || {};
        this.templateId = opts.templateId;
        this.signature = opts.signature;

        this.progressCb = opts.progressCb || null;
        this.successCb = opts.successCb || null;
        this.errorCb = opts.errorCb || null;
    }

    TransloaditXhr.prototype.checkAssemblyStatus = function(assemblyUrl) {
        var self = this;

        $.ajax({
            url: assemblyUrl,
            type: "GET",
            dataType: "json",
            success: function(data, textStatus) {
                if (data.ok && data.ok == "ASSEMBLY_COMPLETED") {
                    if (typeof self.successCb === "function") {
                        self.successCb(data.results);
                    }
                    return;
                }

                if (data.error || (data.ok != "ASSEMBLY_EXECUTING" && data.ok != "ASSEMBLY_UPLOADING")) {
                    if (typeof self.errorCb === "function") {
                        self.errorCb("Failed to check assembly (" + textStatus + ")");
                    }
                    return;
                }

                setTimeout(function() {
                    self.checkAssemblyStatus(assemblyUrl);
                }, 1000);
            },
            error: function(XMLHttpRequest, textStatus) {
                if (typeof self.errorCb === "function") {
                    self.errorCb("Failed to check assembly (" + textStatus + ")");
                }
            }
        });
    };

    // Modified to take in an array of fileBlobs... eg a HTML canvas toDataURL()
    TransloaditXhr.prototype.uploadFiles = function(fileBlobs) {
        var fileBlobs = [].concat(fileBlobs);
        var self = this;

        var formPost = new FormData();
        formPost.append("params", JSON.stringify(this.params));
        formPost.append("signature", this.signature)

        for (var i=0;i<fileBlobs.length;i++) {
          var fileName = "file_" + i;
          formPost.append(fileName, fileBlobs[i]);
        }

        var xhr = new XMLHttpRequest();
        xhr.open("POST", "//api2.transloadit.com/assemblies", true);

        xhr.onreadystatechange = function(event) {
            var req = event.target;

            if (req.readyState === 4) {
                if (req.status === 200) {
                    var parsedData = jQuery.parseJSON(req.responseText);
                    self.checkAssemblyStatus(parsedData.assembly_url);
                } else if (typeof self.errorCb === "function") {
                    if(req.responseText.length > 0) {
                      self.errorCb(jQuery.parseJSON(req.responseText).message);
                    } else {
                      self.errorCb("Failed to upload file");
                    }
                }
            }
        };
        xhr.send(formPost);
    };

    window.TransloaditXhr = TransloaditXhr;

})(window)
