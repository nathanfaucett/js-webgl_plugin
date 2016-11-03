var FastHash = require("@nathanfaucett/fast_hash");


var NativeFloat32Array = typeof(Float32Array) !== "undefined" ? Float32Array : Array,
    NativeUint16Array = typeof(Uint16Array) !== "undefined" ? Uint16Array : Array,
    GLGeometryPrototype;


module.exports = GLGeometry;


function GLGeometry() {

    this.context = null;
    this.geometry = null;

    this.buffers = new FastHash("name");

    this.glVertexBuffer = null;
    this.glIndexBuffer = null;
    this.glIndexLineBuffer = null;

    this.needsVertexCompile = null;
    this.needsIndexCompile = null;
    this.needsLineCompile = null;
}
GLGeometryPrototype = GLGeometry.prototype;

GLGeometry.create = function(context, geometry) {
    return (new GLGeometry()).construct(context, geometry);
};

GLGeometryPrototype.construct = function(context, geometry) {

    this.context = context;
    this.geometry = geometry;

    this.needsVertexCompile = true;
    this.needsIndexCompile = true;
    this.needsLineCompile = true;

    return this;
};

GLGeometryPrototype.destructor = function() {

    this.context = null;
    this.geometry = null;

    this.buffers.clear();

    this.glVertexBuffer = null;
    this.glIndexBuffer = null;
    this.glIndexLineBuffer = null;

    this.needsVertexCompile = false;
    this.needsIndexCompile = false;
    this.needsLineCompile = false;

    return this;
};

GLGeometryPrototype.getVertexBuffer = function() {
    var glVertexBuffer = this.glVertexBuffer;

    if (glVertexBuffer) {
        if (this.needsVertexCompile === false) {
            return glVertexBuffer;
        } else {
            glVertexBuffer.needsCompile = true;
            return GLGeometry_compileVertexBuffer(this);
        }
    } else {
        return GLGeometry_compileVertexBuffer(this);
    }
};

GLGeometryPrototype.getLineBuffer = function() {
    var glIndexLineBuffer = this.glIndexLineBuffer;

    if (glIndexLineBuffer) {
        if (this.needsLineCompile === false) {
            return glIndexLineBuffer;
        } else {
            glIndexLineBuffer.needsCompile = true;
            return GLGeometry_compileLineIndexBuffer(this);
        }
    } else {
        return GLGeometry_compileLineIndexBuffer(this);
    }
};

GLGeometryPrototype.getIndexBuffer = function() {
    var glIndexBuffer = this.glIndexBuffer;

    if (glIndexBuffer) {
        if (this.needsIndexCompile === false) {
            return glIndexBuffer;
        } else {
            glIndexBuffer.needsCompile = true;
            return GLGeometry_compileIndexBuffer(this);
        }
    } else {
        return GLGeometry_compileIndexBuffer(this);
    }
};

function GLGeometry_compileLineIndexBuffer(_this) {
    var context = _this.context,
        gl = context.gl,

        geometry = _this.geometry,
        indexArray = geometry.index,

        length = indexArray.length,
        i = 0,

        lineBuffer = new NativeUint16Array(length * 2),
        glIndexLineBuffer = _this.glIndexLineBuffer || (_this.glIndexLineBuffer = context.createBuffer()),

        triangleIndex = 0,
        index = 0;

    while (i < length) {
        lineBuffer[index] = indexArray[triangleIndex];
        lineBuffer[index + 1] = indexArray[triangleIndex + 1];

        lineBuffer[index + 2] = indexArray[triangleIndex + 1];
        lineBuffer[index + 3] = indexArray[triangleIndex + 2];

        lineBuffer[index + 4] = indexArray[triangleIndex + 2];
        lineBuffer[index + 5] = indexArray[triangleIndex];

        triangleIndex += 3;
        index += 6;
        i += 3;
    }

    _this.needsLineCompile = false;

    return glIndexLineBuffer.compile(gl.ELEMENT_ARRAY_BUFFER, lineBuffer, 0, gl.STATIC_DRAW);
}

function GLGeometry_compileIndexBuffer(_this) {
    var context = _this.context,
        gl = context.gl,
        glIndexBuffer = _this.glIndexBuffer || (_this.glIndexBuffer = context.createBuffer());

    glIndexBuffer.compile(gl.ELEMENT_ARRAY_BUFFER, _this.geometry.index, 0, gl.STATIC_DRAW);
    _this.needsIndexCompile = false;

    return glIndexBuffer;
}

function GLGeometry_compileVertexBuffer(_this) {
    var context = _this.context,
        gl = context.gl,

        geometry = _this.geometry,
        attributes = geometry.attributes.getArray(),

        glVertexBuffer = _this.glVertexBuffer || (_this.glVertexBuffer = context.createBuffer()),
        buffers = _this.buffers,

        vertexLength = 0,
        stride = 0,
        last = 0,
        offset = 0,

        i = -1,
        il = attributes.length - 1,

        vertexArray, attribute, attributeArray, itemSize, index, j, jl, k, kl;

    buffers.clear();

    while (i++ < il) {
        attribute = attributes[i];
        vertexLength += attribute.array.length;
        stride += attribute.itemSize;
    }

    vertexArray = new NativeFloat32Array(vertexLength);

    i = -1;
    while (i++ < il) {
        attribute = attributes[i];
        attributeArray = attribute.array;

        j = 0;
        jl = vertexLength;

        itemSize = attribute.itemSize;
        index = 0;

        offset += last;
        last = itemSize;

        while (j < jl) {
            k = -1;
            kl = itemSize - 1;

            while (k++ < kl) {
                vertexArray[offset + j + k] = attributeArray[index + k];
            }

            j += stride;
            index += itemSize;
        }

        buffers.add(new DataBuffer(attribute.name, offset * 4));
    }

    glVertexBuffer.compile(gl.ARRAY_BUFFER, vertexArray, stride * 4, gl.STATIC_DRAW);
    _this.needsVertexCompile = false;

    return glVertexBuffer;
}

function DataBuffer(name, offset) {
    this.name = name;
    this.offset = offset;
}