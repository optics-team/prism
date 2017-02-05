import UpdateItem from "../UpdateItem";
import ReadItem from "../ReadItem";
import Root from "../Root";
import Document from "../../Document";
import Registry from "../../Registry";

import * as schema from "../../schema";
import * as resource from "../../__mocks__/resource";
import * as hapi from "../__mocks__/hapi";

let updateTask: UpdateItem;

beforeEach(() => {
  updateTask = new UpdateItem(resource.tasks);
});

it("is a PATCH request to resource name and primary keys, joined by `/`", () => {
  expect(updateTask.method).toBe("PATCH");
  expect(updateTask.path).toBe("tasks/{id}");
});

describe("#handle()", () => {
  beforeEach(() => {
    hapi.request.payload = {
      title: "Updated Test Task"
    };
  });

  it("validates request payload against resource schema with `required` omitted", async () => {
    spyOn(schema, "validate").and.callThrough();

    let params = {
      id: "task1"
    };

    await updateTask.handle(params, hapi.request);

    let updateSchema = {
      ...resource.tasks.schema,
      required: undefined
    };

    expect(schema.validate).toHaveBeenCalledWith(hapi.request.payload, updateSchema);
    expect(resource.tasks.source.update).toHaveBeenCalledWith({
      conditions: [{
        field: "id",
        value: "task1"
      }],
      returning: resource.tasks.primaryKeys,
      source: resource.tasks.name,
      schema: updateSchema,
      joins: [{
        from: "owner",
        path: ["owner"],
        source: "users",
        to: "id"
      }, {
        from: "project",
        path: ["project"],
        source: "projects",
        to: "id"
      }],
      data: hapi.request.payload
    });
  });

  it("returns an empty response with a status of `204 No Content`", async () => {
    (resource.tasks.source.update as jest.Mock<any>).mockReturnValue(true);

    await updateTask.handle({}, hapi.request);
    expect((hapi.request as any).generateResponse).toHaveBeenCalled();
    expect(hapi.response.code).toHaveBeenCalledWith(204);
  });
});

describe("#schema()", () => {
  it("returns resource schema with `required` omitted", () => {
    let schema = updateTask.schema({}, hapi.request);

    expect(schema).toEqual({
      ...resource.tasks.schema,
      required: undefined
    });
  });
});

describe("filters", () => {
  let registry: Registry;
  let root: Root;
  let readTask: ReadItem;

  beforeEach(() => {
    registry = new Registry();
    root = new Root();
    readTask = new ReadItem(resource.tasks);

    registry.registerAction(root);
    registry.registerAction(updateTask);
  });

  it("registers a form on the Root action", () => {
    let document = new Document();
    root.decorate(document, {}, hapi.request);

    expect(document.forms).toEqual([{
      rel: resource.tasks.name,
      href: updateTask.path,
      name: "update",
      method: updateTask.method,
      schema: {
        ...resource.tasks.schema,
        required: undefined
      }
    }]);
  });

  it("registers a form on ReadItem", () => {
    registry.registerAction(readTask);

    let document = new Document({
      id: 1337
    });

    readTask.decorate(document, {}, hapi.request);

    expect(document.forms).toEqual([{
      rel: resource.tasks.name,
      href: updateTask.path,
      name: "update",
      params: {
        id: 1337
      },
      method: updateTask.method,
      schema: {
        ...resource.tasks.schema,
        required: undefined
      }
    }]);
  });
});
