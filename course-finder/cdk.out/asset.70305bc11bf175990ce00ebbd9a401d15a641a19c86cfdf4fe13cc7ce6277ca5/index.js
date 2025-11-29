var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/services/courses/handler.ts
var handler_exports = {};
__export(handler_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(handler_exports);
var import_client_dynamodb5 = require("@aws-sdk/client-dynamodb");

// src/services/courses/PostCourses.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");

// src/services/shared/Validator.ts
var MissingFieldError = class extends Error {
  constructor(missingField) {
    super(`Value for ${missingField} expected!`);
  }
};
var JsonError = class extends Error {
};
function validateAsCourseEntry(arg) {
  if (arg.course_name == void 0) {
    throw new MissingFieldError("course_name");
  }
  if (arg.course_code == void 0) {
    throw new MissingFieldError("course_code");
  }
  if (arg.id == void 0) {
    throw new MissingFieldError("id");
  }
}

// src/services/courses/PostCourses.ts
var import_util_dynamodb = require("@aws-sdk/util-dynamodb");

// src/services/shared/Utils.ts
var import_crypto = require("crypto");
function createRandomId() {
  return (0, import_crypto.randomUUID)();
}
function addCorsHeader(arg) {
  if (!arg.headers) {
    arg.headers = {};
  }
  arg.headers["Access-Control-Allow-Origin"] = "*";
  arg.headers["Access-Control-Allow-Methods"] = "*";
}
function parseJSON(arg) {
  try {
    return JSON.parse(arg);
  } catch (error) {
    throw new JsonError(error.message);
  }
}
function hasAdminGroup(event) {
  const groups = event.requestContext.authorizer?.claims["cognito:groups"];
  if (groups) {
    return groups.includes("admins");
  }
  return false;
}

// src/services/courses/PostCourses.ts
async function postCourses(event, ddbClient2) {
  const randomId = createRandomId();
  const item = parseJSON(event.body);
  item.id = randomId;
  validateAsCourseEntry(item);
  const result = await ddbClient2.send(new import_client_dynamodb.PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: (0, import_util_dynamodb.marshall)(item)
  }));
  return {
    statusCode: 201,
    body: JSON.stringify({ id: randomId })
  };
}

// src/services/courses/GetCourses.ts
var import_client_dynamodb2 = require("@aws-sdk/client-dynamodb");
var import_util_dynamodb2 = require("@aws-sdk/util-dynamodb");
async function getCourses(event, ddbClient2) {
  if (event.queryStringParameters) {
    if ("id" in event.queryStringParameters) {
      const courseId = event.queryStringParameters["id"];
      const getItemResponse = await ddbClient2.send(new import_client_dynamodb2.GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          "id": { S: courseId }
        }
      }));
      if (getItemResponse.Item) {
        const unmashalledItem = (0, import_util_dynamodb2.unmarshall)(getItemResponse.Item);
        return {
          statusCode: 200,
          body: JSON.stringify(unmashalledItem)
        };
      } else {
        return {
          statusCode: 404,
          body: JSON.stringify(`Course with id ${courseId} not found!`)
        };
      }
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify("Id required!")
      };
    }
  }
  const result = await ddbClient2.send(new import_client_dynamodb2.ScanCommand({
    TableName: process.env.TABLE_NAME
  }));
  const unmashalledItems = result.Items?.map((item) => (0, import_util_dynamodb2.unmarshall)(item));
  console.log(unmashalledItems);
  return {
    statusCode: 201,
    body: JSON.stringify(unmashalledItems)
  };
}

// src/services/courses/UpdateCourse.ts
var import_client_dynamodb3 = require("@aws-sdk/client-dynamodb");
async function updateCourse(event, ddbClient2) {
  if (event.queryStringParameters && "id" in event.queryStringParameters && event.body) {
    const parsedBody = JSON.parse(event.body);
    const courseId = event.queryStringParameters["id"];
    const requestBodyKey = Object.keys(parsedBody)[0];
    const requestBodyValue = parsedBody[requestBodyKey];
    const updateResult = await ddbClient2.send(new import_client_dynamodb3.UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        "id": { S: courseId }
      },
      UpdateExpression: "set #zzzNew = :new",
      ExpressionAttributeValues: {
        ":new": {
          S: requestBodyValue
        }
      },
      ExpressionAttributeNames: {
        "#zzzNew": requestBodyKey
      },
      ReturnValues: "UPDATED_NEW"
    }));
    return {
      statusCode: 204,
      body: JSON.stringify(updateResult.Attributes)
    };
  }
  return {
    statusCode: 400,
    body: JSON.stringify("Please provide right args!!")
  };
}

// src/services/courses/DeleteCourse.ts
var import_client_dynamodb4 = require("@aws-sdk/client-dynamodb");
async function deleteCourse(event, ddbClient2) {
  if (!hasAdminGroup(event)) {
    return {
      statusCode: 401,
      body: JSON.stringify(`Not authorized!`)
    };
  }
  if (event.queryStringParameters && "id" in event.queryStringParameters) {
    const courseId = event.queryStringParameters["id"];
    await ddbClient2.send(new import_client_dynamodb4.DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        "id": { S: courseId }
      }
    }));
    return {
      statusCode: 200,
      body: JSON.stringify(`Deleted course with id ${courseId}`)
    };
  }
  return {
    statusCode: 400,
    body: JSON.stringify("Please provide right args!!")
  };
}

// src/services/courses/handler.ts
var ddbClient = new import_client_dynamodb5.DynamoDBClient({});
async function handler(event, context) {
  let response;
  try {
    switch (event.httpMethod) {
      case "GET":
        const getResponse = await getCourses(event, ddbClient);
        response = getResponse;
        break;
      case "POST":
        const postResponse = await postCourses(event, ddbClient);
        response = postResponse;
        break;
      case "PUT":
        const putResponse = await updateCourse(event, ddbClient);
        response = putResponse;
        break;
      case "DELETE":
        const deleteResponse = await deleteCourse(event, ddbClient);
        response = deleteResponse;
        break;
      default:
        break;
    }
  } catch (error) {
    if (error instanceof MissingFieldError) {
      return {
        statusCode: 400,
        body: error.message
      };
    }
    if (error instanceof JsonError) {
      return {
        statusCode: 400,
        body: error.message
      };
    }
    return {
      statusCode: 500,
      body: error.message
    };
  }
  addCorsHeader(response);
  return response;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
