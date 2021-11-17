import express from 'express'
import { MUser, MVideo } from '@server/types/models'
import { HttpStatusCode, UserRight } from '../../../../shared'
import { logger } from '../../../helpers/logger'
import { areValidationErrors, doesVideoExist, isValidVideoIdParam } from '../shared'

const videoFilesDeleteWebTorrentValidator = [
  isValidVideoIdParam('id'),

  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.debug('Checking videoFilesDeleteWebTorrent parameters', { parameters: req.params })

    if (areValidationErrors(req, res)) return
    if (!await doesVideoExist(req.params.id, res)) return

    const video = res.locals.videoAll
    const user = res.locals.oauth.token.User

    if (!checkUserCanDeleteFiles(user, res)) return
    if (!checkLocalVideo(video, res)) return

    if (!video.hasWebTorrentFiles()) {
      return res.fail({
        status: HttpStatusCode.BAD_REQUEST_400,
        message: 'This video does not have WebTorrent files'
      })
    }

    if (!video.getHLSPlaylist()) {
      return res.fail({
        status: HttpStatusCode.BAD_REQUEST_400,
        message: 'Cannot delete WebTorrent files since this video does not have HLS playlist'
      })
    }

    return next()
  }
]

const videoFilesDeleteHLSValidator = [
  isValidVideoIdParam('id'),

  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.debug('Checking videoFilesDeleteHLS parameters', { parameters: req.params })

    if (areValidationErrors(req, res)) return
    if (!await doesVideoExist(req.params.id, res)) return

    const video = res.locals.videoAll
    const user = res.locals.oauth.token.User

    if (!checkUserCanDeleteFiles(user, res)) return
    if (!checkLocalVideo(video, res)) return

    if (!video.getHLSPlaylist()) {
      return res.fail({
        status: HttpStatusCode.BAD_REQUEST_400,
        message: 'This video does not have HLS files'
      })
    }

    if (!video.hasWebTorrentFiles()) {
      return res.fail({
        status: HttpStatusCode.BAD_REQUEST_400,
        message: 'Cannot delete HLS playlist since this video does not have WebTorrent files'
      })
    }

    return next()
  }
]

export {
  videoFilesDeleteWebTorrentValidator,
  videoFilesDeleteHLSValidator
}

// ---------------------------------------------------------------------------

function checkLocalVideo (video: MVideo, res: express.Response) {
  if (video.remote) {
    res.fail({
      status: HttpStatusCode.BAD_REQUEST_400,
      message: 'Cannot delete files of remote video'
    })

    return false
  }

  return true
}

function checkUserCanDeleteFiles (user: MUser, res: express.Response) {
  if (user.hasRight(UserRight.MANAGE_VIDEO_FILES) !== true) {
    res.fail({
      status: HttpStatusCode.FORBIDDEN_403,
      message: 'User cannot update video files'
    })

    return false
  }

  return true
}
