import httpStatus from "http-status";
import type { Request, Response } from "express";

import { CommentModel, ProjectModel, TestCaseModel } from "../models";
import { catchAsync } from "../helpers/catchAsync";
import ApiError from "../helpers/ApiError";

const testCaseCreate = catchAsync(async (req: Request, res: Response) => {
  const testcase = await TestCaseModel.create(req.body);

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
    .then(testcase => testcase.populate({
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
    }));

  if(!testcase) {
    throw new ApiError(httpStatus.NOT_FOUND, 'TestCase not found');
  }

  res.status(httpStatus.OK).send({ testcase });
});

const testCasesAllGet = catchAsync(async (req: Request, res: Response) => {
  const testcases = await TestCaseModel.find({ linkedProject: req.params.projectId });
  res.status(httpStatus.OK).send({ testcases });
});

const testCasesGet = catchAsync(async (req: Request, res: Response) => {
  const testcases = await TestCaseModel.find({ linkedProject: req.params.projectId, environment: req.params.environmentId });
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
    .populate({
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
    }));

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
}
