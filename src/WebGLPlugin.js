var mat4 = require("@nathanfaucett/mat4"),
    WebGLContext = require("@nathanfaucett/webgl_context"),
    sceneRenderer = require("@nathanfaucett/scene_renderer"),
    indexOf = require("@nathanfaucett/index_of"),
    isNullOrUndefined = require("@nathanfaucett/is_null_or_undefined"),
    GLGeometry = require("./GLGeometry"),
    GLMaterial = require("./GLMaterial"),
    GLShader = require("./GLShader");


var Plugin = sceneRenderer.Plugin,
    PluginPrototype = Plugin.prototype,
    WebGLPluginPrototype;


module.exports = WebGLPlugin;


function WebGLPlugin() {

    Plugin.call(this);

    this.canvas = null;
    this.context = new WebGLContext();

    this._geometries = {};
    this._materials = {};

    this._shaderHash = {};
    this._shaders = [];
}
Plugin.extend(WebGLPlugin, "webgl_plugin.WebGLPlugin");
WebGLPluginPrototype = WebGLPlugin.prototype;

WebGLPluginPrototype.destructor = function() {

    PluginPrototype.destructor.call(this);

    this.canvas = null;
    this.context.clearGL();

    return this;
};

WebGLPluginPrototype.setCanvas = function(canvas) {

    this.canvas = canvas;
    this.context.setCanvas(canvas);

    return this;
};

WebGLPluginPrototype.getGLGeometry = function(geometry) {
    var geometries = this._geometries,
        id = geometry.getId();

    return (
        geometries[id] ||
        (geometries[id] = GLGeometry.create(this.context, geometry))
    );
};

WebGLPluginPrototype.getGLMaterial = function(material) {
    var materials = this._materials,
        id = material.getId();

    return (
        materials[id] ||
        (materials[id] = GLMaterial.create(this, this.context, material))
    );
};

WebGLPluginPrototype.bindMaterial = function(material, force) {
    this.context.setCullFace(material.cullFace, force);
    this.context.setBlending(material.blending, force);
    if (material.wireframe) {
        this.context.setLineWidth(material.wireframeLineWidth, force);
    }
};

WebGLPluginPrototype.bindUniforms = function(projection, modelView, normalMatrix, uniforms, glUniforms, force) {
    var glHash = glUniforms.getObject(),
        glArray = glUniforms.getArray(),
        glUniform, uniform, i, il;

    if (glHash.modelViewMatrix) {
        glHash.modelViewMatrix.set(modelView, force);
    }
    if (glHash.perspectiveMatrix) {
        glHash.perspectiveMatrix.set(projection, force);
    }
    if (glHash.normalMatrix) {
        glHash.normalMatrix.set(normalMatrix, force);
    }

    i = -1;
    il = glArray.length - 1;

    while (i++ < il) {
        glUniform = glArray[i];

        if ((uniform = uniforms[glUniform.name])) {
            glUniform.set(uniform, force);
        }
    }

    return this;
};

var bindBoneUniforms_mat = mat4.create();
WebGLPluginPrototype.bindBoneUniforms = function(bones, glUniforms, force) {
    var boneMatrix = glUniforms.getObject().boneMatrix,
        boneMatrixValue, mat, i, il, index, bone;

    if (boneMatrix) {
        boneMatrixValue = boneMatrix.value;

        mat = bindBoneUniforms_mat;

        i = -1;
        il = bones.length - 1;
        index = 0;

        while (i++ < il) {
            if ((bone = bones[i].getComponent("mesh.Bone"))) {
                mat4.mul(mat, bone.uniform, bone.bindPose);

                boneMatrixValue[index] = mat[0];
                boneMatrixValue[index + 1] = mat[1];
                boneMatrixValue[index + 2] = mat[2];
                boneMatrixValue[index + 3] = mat[3];
                boneMatrixValue[index + 4] = mat[4];
                boneMatrixValue[index + 5] = mat[5];
                boneMatrixValue[index + 6] = mat[6];
                boneMatrixValue[index + 7] = mat[7];
                boneMatrixValue[index + 8] = mat[8];
                boneMatrixValue[index + 9] = mat[9];
                boneMatrixValue[index + 10] = mat[10];
                boneMatrixValue[index + 11] = mat[11];
                boneMatrixValue[index + 12] = mat[12];
                boneMatrixValue[index + 13] = mat[13];
                boneMatrixValue[index + 14] = mat[14];
                boneMatrixValue[index + 15] = mat[15];

                index += 16;
            }
        }

        boneMatrix.set(boneMatrixValue, force);
    }
};

WebGLPluginPrototype.bindAttributes = function(buffers, vertexBuffer, glAttributes, force) {
    var glArray = glAttributes._array,
        i = -1,
        il = glArray.length - 1,
        glAttribute, buffer;

    while (i++ < il) {
        glAttribute = glArray[i];
        buffer = buffers[glAttribute.name];

        if (buffer) {
            glAttribute.set(vertexBuffer, buffer.offset, force);
        }
    }

    return this;
};

function getOptions(data) {
    var options = {},
        material;

    options.boneCount = data.bones ? data.bones.length : 0;
    options.boneWeightCount = data.boneWeightCount || 0;
    options.useBones = options.boneCount !== 0;
    options.isSprite = (!isNullOrUndefined(data.x) && !isNullOrUndefined(data.y) &&
        !isNullOrUndefined(data.width) && !isNullOrUndefined(data.height)
    );

    if (data.material) {
        material = data.material;

        options.receiveShadow = material.receiveShadow;
        options.castShadow = material.castShadow;
        options.cullFace = material.cullFace;
        options.wireframe = material.wireframe;
    }

    return options;
}

WebGLPluginPrototype.createProgram = function(shader, data, force) {
    var id = data.getId(),

        shaders = this._shaders,
        shaderHash = this._shaderHash,

        glShader = shaderHash[id],

        options, vertex, fragment, i, il, cacheData;

    if (glShader && !force) {
        program = glShader.program;
    } else {
        if (glShader) {
            this.context.deleteProgram(glShader.program);
            shaders.splice(indexOf(program), 1);
            delete shaderHash[id];
            glShader = null;
        }
        options = getOptions(data);

        vertex = shader.vertex(options);
        fragment = shader.fragment(options);

        i = -1;
        il = shaders.length - 1;
        while (i++ < il) {
            cacheData = shaders[i];

            if (cacheData.vertex === vertex && cacheData.fragment === fragment) {
                glShader = cacheData;
                break;
            }
        }

        if (!glShader) {
            glShader = new GLShader();

            program = glShader.program = this.context.createProgram();

            glShader.vertex = vertex;
            glShader.fragment = fragment;

            program.compile(vertex, fragment);

            shaders[id] = shaderHash[id] = shaders[shaders.length] = glShader;
        } else {
            glShader.used += 1;
            program = glShader.program;
        }

        data.on("update", glShader.onUpdate);
    }

    return program;
};

WebGLPluginPrototype.getGLShader = function(data) {
    var shader = this._shaderHash[data.getId()];
    return !!shader && shader.program;
};

WebGLPluginPrototype.before = function() {
    var camera = this.sceneRenderer.scene.getComponentManager("camera.Camera").getActive(),
        context = this.context;

    context.setViewport(0, 0, camera.width, camera.height);
    context.setClearColor(camera.background, 1);
    context.clearCanvas();

    return this;
};

WebGLPluginPrototype.after = function() {
    return this;
};