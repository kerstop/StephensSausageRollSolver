use std::borrow::Cow;

use bevy::{
    core_pipeline::core_3d::Opaque3d,
    ecs::system::lifetimeless::SRes,
    pbr,
    prelude::*,
    render::{
        render_graph,
        render_phase::{
            AddRenderCommand, PhaseItem, RenderCommand, RenderCommandResult, TrackedRenderPass,
        },
        render_resource::{
            self, BindGroupLayout, BindGroupLayoutEntries, BufferUsages, CachedComputePipelineId,
            ComputePipelineDescriptor, PipelineCache, ShaderStages, StorageBuffer,
        },
        renderer::{RenderDevice, RenderQueue},
    },
};

const SHADER_ASSET_PATH: &str = "src/shaders/edge_mesh_generation.wgsl";

struct ComputeShaderPlugin;

impl Plugin for ComputeShaderPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<GraphEdgePipelineInfo>();
        app.add_render_command::<Opaque3d, (
            bevy::render::render_phase::SetItemPipeline,
            pbr::SetMeshViewBindGroup<0>,
            pbr::SetMeshBindGroup<1>,
            pbr::SetMaterialBindGroup<StandardMaterial, 2>,
            DrawGraphEdges,
        )>();
    }
}

#[derive(Resource)]
struct GraphEdgePipelineInfo {
    input_bind_group_layout: BindGroupLayout,
    pipeline_id: CachedComputePipelineId,
}

impl FromWorld for GraphEdgePipelineInfo {
    fn from_world(world: &mut World) -> Self {
        let render_device = world.resource::<RenderDevice>();
        let input_bind_group_layout = render_device.create_bind_group_layout(
            "NodePositions",
            &BindGroupLayoutEntries::sequential(
                ShaderStages::COMPUTE,
                (
                    render_resource::binding_types::storage_buffer_sized(true, None),
                    render_resource::binding_types::storage_buffer_sized(true, None),
                ),
            ),
        );
        let shader = world.load_asset(SHADER_ASSET_PATH);
        let pipeline_cache = world.resource::<PipelineCache>();
        let pipeline = pipeline_cache.queue_compute_pipeline(ComputePipelineDescriptor {
            label: None,
            layout: vec![input_bind_group_layout.clone()],
            push_constant_ranges: vec![],
            shader,
            shader_defs: vec![],
            entry_point: Cow::from("main"),
            zero_initialize_workgroup_memory: false,
        });
        GraphEdgePipelineInfo {
            input_bind_group_layout,
            pipeline_id: pipeline,
        }
    }
}

struct ComputeShaderNode;

impl render_graph::Node for ComputeShaderNode {
    fn input(&self) -> Vec<render_graph::SlotInfo> {
        vec![render_graph::SlotInfo {
            name: "points".into(),
            slot_type: render_graph::SlotType::Buffer,
        }]
    }
    fn run<'w>(
        &self,
        graph: &mut render_graph::RenderGraphContext,
        render_context: &mut bevy::render::renderer::RenderContext<'w>,
        world: &'w World,
    ) -> std::result::Result<(), render_graph::NodeRunError> {
        let pipeline_cache = world.resource::<render_resource::PipelineCache>();
        let pipeline_info = world.resource::<GraphEdgePipelineInfo>();
        let bind_group = world.resource::<GraphEdgeBindGroupInfo>();

        match pipeline_cache.get_compute_pipeline(pipeline_info.pipeline_id) {
            Some(pipeline) => {
                let mut pass = render_context
                    .command_encoder()
                    .begin_compute_pass(&render_resource::ComputePassDescriptor::default());

                pass.set_bind_group(0, &bind_group.bind_group, &[]);
                pass.set_pipeline(pipeline);
                pass.dispatch_workgroups(bind_group.number_of_edges, 1, 1);
            }
            None => todo!(),
        };

        todo!()
    }
}

struct DrawGraphEdges;

impl RenderCommand<bevy::core_pipeline::core_3d::Opaque3d> for DrawGraphEdges {
    type Param = SRes<GraphEdgeBuffers>;

    type ViewQuery = ();

    type ItemQuery = ();

    fn render<'w>(
        item: &bevy::core_pipeline::core_3d::Opaque3d,
        view: bevy::ecs::query::ROQueryItem<'w, Self::ViewQuery>,
        entity: Option<bevy::ecs::query::ROQueryItem<'w, Self::ItemQuery>>,
        param: bevy::ecs::system::SystemParamItem<'w, '_, Self::Param>,
        pass: &mut TrackedRenderPass<'w>,
    ) -> RenderCommandResult {
        info!("s");
        let graph_edge_buffers = param.into_inner();
        let index_buffer = match graph_edge_buffers.index.buffer() {
            Some(b) => b,
            None => return RenderCommandResult::Skip,
        };
        let vertex_buffer = match graph_edge_buffers.vertex.buffer() {
            Some(b) => b,
            None => return RenderCommandResult::Skip,
        };

        pass.set_index_buffer(
            index_buffer.slice(..),
            0,
            render_resource::IndexFormat::Uint32,
        );
        pass.set_vertex_buffer(0, vertex_buffer.slice(..));
        pass.draw_indexed(0..index_buffer.size() as u32, 0, 0..1);

        RenderCommandResult::Success
    }
}

#[derive(Resource)]
struct GraphEdgeBindGroupInfo {
    bind_group: render_resource::BindGroup,
    number_of_edges: u32,
}

#[derive(Resource)]
struct GraphEdgeBuffers {
    source_points: StorageBuffer<Vec<Vec3>>,
    index: StorageBuffer<Vec<u32>>,
    vertex: StorageBuffer<Vec<Vec3>>,
}

impl FromWorld for GraphEdgeBuffers {
    fn from_world(world: &mut World) -> Self {
        let mut r = GraphEdgeBuffers {
            source_points: StorageBuffer::default(),
            index: StorageBuffer::default(),
            vertex: StorageBuffer::default(),
        };
        r.index.add_usages(BufferUsages::INDEX);
        r.vertex.add_usages(BufferUsages::VERTEX);
        {
            error!("delete this block");
            r.vertex.set(vec![Vec3::X, Vec3::Y, Vec3::ZERO]);
            r.vertex.write_buffer(
                world.get_resource::<RenderDevice>().unwrap(),
                world.get_resource::<RenderQueue>().unwrap(),
            );
            r.index.set(vec![0, 1, 2]);
            r.index.write_buffer(
                world.get_resource::<RenderDevice>().unwrap(),
                world.get_resource::<RenderQueue>().unwrap(),
            );
        }
        r
    }
}

fn prepare_graph_edge_bind_group(
    mut commands: Commands,
    pipeline: Res<GraphEdgePipelineInfo>,
    neighbors: Query<&super::GraphEdgeNeighbors>,
    nodes: Query<&Transform>,
    render_device: Res<RenderDevice>,
    render_queue: Res<RenderQueue>,
    graph_edge_buffer: ResMut<GraphEdgeBuffers>,
) {
    let mut points = Vec::new();

    for &super::GraphEdgeNeighbors(e1, e2) in neighbors {
        points.push(nodes.get(e1).unwrap().translation);
        points.push(nodes.get(e2).unwrap().translation);
    }
    let number_of_edges = neighbors.iter().len() as u32;
    let buffers = &mut graph_edge_buffer.into_inner();
    buffers.source_points.set(points);

    buffers
        .source_points
        .write_buffer(&render_device, &render_queue);

    commands.insert_resource(GraphEdgeBindGroupInfo {
        bind_group: render_device.create_bind_group(
            None,
            &pipeline.input_bind_group_layout,
            &render_resource::BindGroupEntries::single(&buffers.source_points),
        ),
        number_of_edges,
    });
}
