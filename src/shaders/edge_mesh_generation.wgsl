
@group(0) @binding(0) var<storage, read> points: array<vec3<f32>>;
@group(0) @binding(1) var<storage, read_write> mesh: array<vec3<f32>>;
@group(0) @binding(2) var<storage, read_write> index: array<u32>;
//@group(0) @binding(3) var<uniform> camera_position: vec3<f32>;



@compute @workgroup_size(16,1,1)
fn compute(@builtin(global_invocation_id) invocation_id: vec3<u32>) {
    let i = invocation_id.x;    
    let p1 = points[i*2];
    let p2 = points[i*2+1];

    let p1_p2 = normalize(p2 - p1);

    mesh[i*3] = p1 + vec3(0,1,0);
    mesh[i*3+1] = p1 - vec3(0,1,0);
    mesh[i*3+2] = p2;

    index[i*3] = i*3;
    index[i*3+1] = i*3+1;
    index[i*3+2] = i*3+2;



}
