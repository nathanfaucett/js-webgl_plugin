module.exports = GLShader;


function GLShader() {
    var _this = this;

    this.used = 1;
    this.program = null;
    this.vertex = null;
    this.fragment = null;

    this.onUpdate = function() {
        _this.program.needsUpdate = true;
    };
}