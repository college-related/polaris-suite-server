import httpStatus from "http-status";
import type { Request, Response } from "express";

import { CommentModel, ProjectModel, TestCaseModel } from "../models";
import { catchAsync } from "../helpers/catchAsync";
import ApiError from "../helpers/ApiError";
import { testCaseRunObject } from "../helpers/testCase";

const testCaseCreate = catchAsync(async (req: Request, res: Response) => {
  const testBody = {
    ...req.body,
    testSchema: [
      {
        name: 'Suite',
        params: [`Suite for ${req.body.name}`, "() => {}"],
        returns: null,
        customSchema: null,
        customFunctions: [],
        children: [
          {
            name: 'Test',
            params: [`${req.body.name}`, "() => {}"],
            returns: null,
            customSchema: null,
            customFunctions: [],
            children: [
              {
                name: 'Expect',
                params: [2],
                returns: "next-return",
                customSchema: null,
                customFunctions: [],
                chidren: [],
              },
              {
                name: 'Equals',
                params: [2],
                returns: null,
                customSchema: null,
                customFunctions: [],
                chidren: [],
              },
            ],
          }
        ],
      }
    ],
  }
  const testcase = await TestCaseModel.create(testBody);

  res.status(httpStatus.CREATED).json({ testcase });
});

const testCaseAllCreate = catchAsync(async (req: Request, res: Response) => {

  const project = await ProjectModel.findById(req.params.projectId);

  if(!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }

  const environments = project.environments;

  let testcases = [];

  for(let i = 0; i < environments.length; i++) {
    testcases[i] = await TestCaseModel.create({
      ...req.body,
      environment: environments[i],
      linkedProject: req.params.projectId,
    });
  }

  res.status(httpStatus.CREATED).json({ testcases });
});

const testCaseGet = catchAsync(async (req: Request, res: Response) => {
  const testcase = await TestCaseModel.findById(req.params.testcaseId)
    .then(testcase => testcase.populate([
      {
        path: 'comments',
        populate: [
          { 
            path: 'userId',
            model: 'User',
          },
          {
            path: 'replies',
            populate: {
              path: 'userId',
              model: 'User',
            }
          }
        ],
      },
      {
        path: 'environment',
        model: 'Environment',
      },
      {
        path: 'linkedProject',
        model: 'Project',
      }
    ]));

  if(!testcase) {
    throw new ApiError(httpStatus.NOT_FOUND, 'TestCase not found');
  }

  res.status(httpStatus.OK).send({ testcase });
});

const testCasesAllGet = catchAsync(async (req: Request, res: Response) => {
  const testcases = await TestCaseModel.find({ linkedProject: req.params.projectId })
    .populate([
      {
        path: 'comments',
        populate: [
          { 
            path: 'userId',
            model: 'User',
          },
          {
            path: 'replies',
            populate: {
              path: 'userId',
              model: 'User',
            }
          }
        ],
      },
      {
        path: 'environment',
        model: 'Environment',
      },
      {
        path: 'linkedProject',
        model: 'Project',
      }
    ]);
  res.status(httpStatus.OK).send({ testcases });
});

const testCasesGet = catchAsync(async (req: Request, res: Response) => {
  const testcases = await TestCaseModel.find({ linkedProject: req.params.projectId, environment: req.params.environmentId })
    .populate([
      {
        path: 'comments',
        populate: [
          { 
            path: 'userId',
            model: 'User',
          },
          {
            path: 'replies',
            populate: {
              path: 'userId',
              model: 'User',
            }
          }
        ],
      },
      {
        path: 'environment',
        model: 'Environment',
      },
      {
        path: 'linkedProject',
        model: 'Project',
      }
    ]);
  res.status(httpStatus.OK).send({ testcases });
});

const testCaseDelete = catchAsync(async (req: Request, res: Response) => {
  const testCase = await TestCaseModel.findById(req.params.testcaseId);

  if(!testCase) {
    throw new ApiError(httpStatus.NOT_FOUND, 'TestCase not found');
  }

  for (let i = 0; i < testCase.comments.length; i++) {
    await CommentModel.findByIdAndDelete(testCase.comments[i]);
  }

  await testCase.deleteOne();

  res.status(httpStatus.OK).send({ message: 'Deleted successfully' });    
});

const testCaseUpdate = catchAsync(async (req: Request, res: Response) => {
  const testcase = await TestCaseModel.findById(req.params.testcaseId);

  if(!testcase) {
    throw new ApiError(httpStatus.NOT_FOUND, 'TestCase not found');
  }

  Object.assign(testcase, req.body);
  await testcase.save().then(testcase => testcase
    .populate([
      {
        path: 'comments',
        populate: [
          { 
            path: 'userId',
            model: 'User',
          },
          {
            path: 'replies',
            populate: {
              path: 'userId',
              model: 'User',
            }
          }
        ],
      },
      {
        path: 'environment',
        model: 'Environment',
      },
      {
        path: 'linkedProject',
        model: 'Project',
      }
    ]));

  res.status(httpStatus.OK).send({ testcase });
});

const testCaseRun = catchAsync(async (req: Request, res: Response) => {
  const testcase = await TestCaseModel.findById(req.params.testcaseId);

  if(!testcase) {
    throw new ApiError(httpStatus.NOT_FOUND, 'TestCase not found');
  }

  await testCaseRunObject(testcase.testSchema);

  const newTestRuns = [{
    result: '',
    status: 'pass',
    logs: [
      'run logs',
    ],
    initiatedBy: req.body.userId,
    createdAt: new Date(),
  }, ...testcase.testRuns];

  Object.assign(testcase, { testRuns: newTestRuns, recentRun: newTestRuns[0].status });

  await testcase.save().then(testcase => testcase
    .populate([
      {
        path: 'comments',
        populate: [
          {
            path: 'userId',
            model: 'User',
          },
          {
            path: 'replies',
            populate: {
              path: 'userId',
              model: 'User',
            }
          }
        ],
      },
      {
        path: 'environment',
        model: 'Environment',
      },
      {
        path: 'linkedProject',
        model: 'Project',
      }
    ]));

  res.status(httpStatus.OK).send({ testcase });
});

export {
  testCaseCreate,
  testCaseAllCreate,
  testCaseGet,
  testCasesGet,
  testCasesAllGet,
  testCaseDelete,
  testCaseUpdate,
  testCaseRun,
}
