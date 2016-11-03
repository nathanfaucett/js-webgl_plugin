var GLMaterialPrototype;


module.exports = GLMaterial;


function GLMaterial() {
    this.renderer = null;
    this.context = null;
    this.material = null;
}
GLMaterialPrototype = GLMaterial.prototype;

GLMaterial.create = function(renderer, context, material) {
    return (new GLMaterial()).construct(renderer, context, material);
};

GLMaterialPrototype.construct = function(renderer, context, material) {

    this.renderer = renderer;
    this.context = context;
    this.material = material;

    return this;
};

GLMaterialPrototype.destructor = function() {

    this.renderer = null;
    this.context = null;
    this.material = null;

    return this;
};

GLMaterialPrototype.getProgramFor = function(data) {
    var shader = this.renderer._shaderHash[data.getId()],
        program;

    if (shader) {
        program = shader.program;

        if (program.needsCompile === false) {
            return program;
        } else {
            return this.renderer.createProgram(this.material.shader, data, force);
        }
    } else {
        return this.renderer.createProgram(this.material.shader, data);
    }
};